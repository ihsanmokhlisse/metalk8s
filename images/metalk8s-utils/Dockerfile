# SHA256 digest of the base image
ARG BASE_IMAGE_SHA256
ARG BASE_IMAGE=docker.io/centos

FROM $BASE_IMAGE@sha256:$BASE_IMAGE_SHA256

# Kubernetes version
ARG KUBERNETES_VERSION
# Salt version
ARG SALT_VERSION

COPY configure-repos.sh /
RUN /configure-repos.sh 7 $SALT_VERSION && rm /configure-repos.sh

# Timestamp of the build, formatted as RFC3339
ARG BUILD_DATE
# Git revision o the tree at build time
ARG VCS_REF
# Version of the image
ARG VERSION
# Version of the project, e.g. `git describe --always --long --dirty --broken`
ARG METALK8S_VERSION

# These contain BUILD_DATE so should come 'late' for layer caching
LABEL maintainer="moonshot-platform@scality.com" \
      # http://label-schema.org/rc1/
      org.label-schema.build-date="$BUILD_DATE" \
      org.label-schema.name="metalk8s-utils" \
      org.label-schema.description="Utilities container for MetalK8s" \
      org.label-schema.url="https://github.com/scality/metalk8s/" \
      org.label-schema.vcs-url="https://github.com/scality/metalk8s.git" \
      org.label-schema.vcs-ref="$VCS_REF" \
      org.label-schema.vendor="Scality" \
      org.label-schema.version="$VERSION" \
      org.label-schema.schema-version="1.0" \
      # https://github.com/opencontainers/image-spec/blob/master/annotations.md
      org.opencontainers.image.created="$BUILD_DATE" \
      org.opencontainers.image.authors="moonshot-platform@scality.com" \
      org.opencontainers.image.url="https://github.com/scality/metalk8s/" \
      org.opencontainers.image.source="https://github.com/scality/metalk8s.git" \
      org.opencontainers.image.version="$VERSION" \
      org.opencontainers.image.revision="$VCS_REF" \
      org.opencontainers.image.vendor="Scality" \
      org.opencontainers.image.title="metalk8s-utils" \
      org.opencontainers.image.description="Utilities container for MetalK8s" \
      # https://docs.openshift.org/latest/creating_images/metadata.html
      io.openshift.tags="metalk8s,utils" \
      io.k8s.description="Utilities container for MetalK8s" \
      io.openshift.non-scalable="true" \
      # Various
      com.scality.metalk8s.version="$METALK8S_VERSION"

# Final layers, installing tooling
RUN yum install -y epel-release && \
    yum install -y --setopt=skip_missing_names_on_install=False \
        bash-completion \
        bash-completion-extras \
        bind-utils \
        bzip2 \
        conntrack-tools \
        cri-tools \
        curl \
        e2fsprogs \
        ebtables \
        etcd \
        ethtool \
        gdb \
        git \
        htop \
        httpd-tools \
        httpie \
        iotop \
        iperf \
        iperf3 \
        iproute \
        ipset \
        iptables \
        ipvsadm \
        jnettop \
        jq \
        "kubectl-${KUBERNETES_VERSION}" \
        less \
        lsof \
        ltrace \
        lvm2 \
        net-tools \
        nethogs \
        nmap \
        nmap-ncat \
        openssh-clients \
        openssh-server \
        openssl \
        parted \
        perf \
        rsync \
        salt-master \
        salt-minion \
        socat \
        strace \
        sysstat \
        tcpdump \
        telnet \
        util-linux \
        vim \
        wget \
        wireshark \
        xfsprogs \
        && \
    yum clean all
