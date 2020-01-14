locals {
  bastion = {
    enabled     = var.bastion_enabled,
    proxy_port  = var.bastion_proxy_port,
    setup_tests = var.bastion_setup_tests,
    test_branch = var.bastion_test_branch,
  }
}

resource "openstack_compute_instance_v2" "bastion" {
  count = local.bastion.enabled ? 1 : 0

  name = "${local.prefix}-bastion"

  # Always install Bastion with CentOS, for simplicity
  image_name  = var.openstack_images["centos"]
  flavor_name = var.openstack_flavours.bastion
  key_pair    = openstack_compute_keypair_v2.local_ssh_key.name

  security_groups = concat(
    [openstack_networking_secgroup_v2.nodes.name],
    openstack_networking_secgroup_v2.bastion[*].name,
  )

  network {
    access_network = true
    name           = data.openstack_networking_network_v2.default_network.name
  }

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file(var.ssh_key_pair.private_key)
  }

  # Provision scripts for remote-execution
  provisioner "file" {
    source      = "${path.root}/scripts"
    destination = "/home/centos/scripts"
  }

  provisioner "remote-exec" {
    inline = ["chmod -R +x /home/centos/scripts"]
  }

  # Generate an SSH keypair
  provisioner "remote-exec" {
    inline = [
      "ssh-keygen -t rsa -b 4096 -N '' -f /home/centos/.ssh/bastion"
    ]
  }
}

locals {
  bastion_ip = (
    local.bastion.enabled
    ? openstack_compute_instance_v2.bastion[0].access_ip_v4
    : ""
  )
}


# Ports on private networks
resource "openstack_networking_port_v2" "control_plane_bastion" {
  name       = "${local.control_plane_network.name}-bastion"
  network_id = local.control_plane_subnet[0].network_id

  admin_state_up        = true
  no_security_groups    = true
  port_security_enabled = false

  fixed_ip {
    subnet_id = local.control_plane_subnet[0].id
  }

  count = local.bastion.enabled && local.control_plane_network.enabled ? 1 : 0
}
resource "openstack_compute_interface_attach_v2" "control_plane_bastion" {
  count = local.bastion.enabled && local.control_plane_network.enabled ? 1 : 0

  instance_id = openstack_compute_instance_v2.bastion[0].id
  port_id     = openstack_networking_port_v2.control_plane_bastion[0].id
}

resource "openstack_networking_port_v2" "workload_plane_bastion" {
  name       = "${local.workload_plane_network.name}-bastion"
  network_id = local.workload_plane_subnet[0].network_id

  admin_state_up        = true
  no_security_groups    = true
  port_security_enabled = false

  fixed_ip {
    subnet_id = local.workload_plane_subnet[0].id
  }

  count = local.bastion.enabled && local.workload_plane_network.enabled ? 1 : 0
}
resource "openstack_compute_interface_attach_v2" "workload_plane_bastion" {
  count = local.bastion.enabled && local.workload_plane_network.enabled ? 1 : 0

  instance_id = openstack_compute_instance_v2.bastion[0].id
  port_id     = openstack_networking_port_v2.workload_plane_bastion[0].id
}

resource "null_resource" "bastion_iface_config" {
  count = local.bastion.enabled ? 1 : 0

  depends_on = [
    openstack_compute_interface_attach_v2.control_plane_bastion,
    openstack_compute_interface_attach_v2.workload_plane_bastion,
  ]

  triggers = {
    bastion = openstack_compute_instance_v2.bastion[0].id,
    cp_port = (
      local.control_plane_network.enabled
      ? openstack_networking_port_v2.control_plane_bastion[0].id
      : ""
    ),
    wp_port = (
      local.workload_plane_network.enabled
      ? openstack_networking_port_v2.workload_plane_bastion[0].id
      : ""
    )
  }

  connection {
    host        = openstack_compute_instance_v2.bastion[0].access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file(var.ssh_key_pair.private_key)
  }

  # Configure network interfaces for private networks
  provisioner "remote-exec" {
    inline = [
      for mac_address in concat(
        local.control_plane_network.enabled
        ? [openstack_networking_port_v2.control_plane_bastion[0].mac_address]
        : [],
        local.workload_plane_network.enabled
        ? [openstack_networking_port_v2.workload_plane_bastion[0].mac_address]
        : [],
      ) :
      "sudo bash scripts/network-iface-config.sh ${mac_address}"
    ]
  }
}


# HTTP proxy for selective online access from Bootstrap or Nodes
resource "null_resource" "bastion_http_proxy" {
  count = local.bastion.enabled ? 1 : 0

  depends_on = [openstack_compute_instance_v2.bastion]

  connection {
    host        = openstack_compute_instance_v2.bastion[0].access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file(var.ssh_key_pair.private_key)
  }

  # Prepare Squid configuration
  provisioner "file" {
    destination = "/home/centos/squid.conf"
    content = templatefile(
      "${path.module}/templates/squid.conf.tpl",
      {
        src_cidr   = data.openstack_networking_subnet_v2.default_subnet.cidr,
        proxy_port = local.bastion.proxy_port,
      }
    )
  }

  provisioner "remote-exec" {
    inline = [
      # Install Squid
      "sudo yum -y install squid",
      # Configure Squid
      "sudo cp /home/centos/squid.conf /etc/squid/squid.conf",
      "sudo chown root:squid /etc/squid/squid.conf",
      # Enable and start Squid
      "sudo systemctl enable squid",
      "sudo systemctl start squid",
    ]
  }
}

# FIXME: if we could setup bastion as a router for the private networks,
#        any host using this router could run the tests...
#        maybe simply suggest using `sshuttle` with the Bastion?
# NOTE: after this is provisioned, one can run E2E tests with `tox` from the
#       cloned repository on the Bastion
resource "null_resource" "setup_tests_bastion" {
  count = local.bastion.enabled && local.bastion.setup_tests ? 1 : 0

  # NOTE: after this is enabled, one can run `tox` commands from the cloned
  #       repository on the Bastion
  depends_on = [openstack_compute_instance_v2.bastion]


  connection {
    host        = local.bastion_ip
    type        = "ssh"
    user        = "centos"
    private_key = file(var.ssh_key_pair.private_key)
  }

  # Install tox
  provisioner "remote-exec" {
    inline = [
      "sudo yum install -y epel-release",
      "sudo yum install -y python36-pip",
      "sudo pip3.6 install tox",
    ]
  }

  # Clone repository
  provisioner "remote-exec" {
    inline = [
      "sudo yum install -y git",
      join(" ", compact([
        "git clone",
        local.bastion.test_branch != ""
        ? "--branch ${local.bastion.test_branch}"
        : "",
        "--single-branch",
        "https://github.com/scality/metalk8s.git",
        local.bastion.test_branch != ""
        ? "metalk8s-${replace(local.bastion.test_branch, "/", "-")}"
        : "metalk8s",
      ])),
    ]
  }
}
