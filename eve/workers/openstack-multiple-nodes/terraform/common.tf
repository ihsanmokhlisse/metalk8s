variable "prefix" {
  type    = string
  default = ""
}

resource "random_string" "current" {
  length  = 5
  special = false
}

locals {
  prefix = "metalk8s-${
    var.prefix != "" ? var.prefix : random_string.current.result
  }"
}
