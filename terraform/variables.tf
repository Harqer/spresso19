variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string

  validation {
    condition     = length(trimspace(var.project_id)) > 0
    error_message = "project_id must be supplied explicitly for each environment."
  }
}

variable "region" {
  description = "The default region for resources"
  type        = string
  default     = "us-central1"
}

variable "enable_tool_server" {
  description = "Whether the approved Cloud Run tool-server boundary is enabled."
  type        = bool
  default     = false
}

variable "tool_server_image" {
  description = "Immutable production Artifact Registry image for the Spresso tool server"
  type        = string

  validation {
    condition = (
      can(regex("^[a-z0-9-]+-docker\\.pkg\\.dev/.+@sha256:[a-f0-9]{64}$", var.tool_server_image)) &&
      !strcontains(var.tool_server_image, "/hello")
    )
    error_message = "tool_server_image must be an immutable Artifact Registry image pinned by sha256 digest."
  }
}
