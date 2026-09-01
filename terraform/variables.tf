variable "project_id" {
  description = "Verified Google Cloud project hosting Spresso."
  type        = string
  default     = "get-spresso"
}

variable "region" {
  description = "Primary Google Cloud region for regional services."
  type        = string
  default     = "us-central1"
}

variable "tool_server_image" {
  description = "Immutable container image for the optional Cloud Run tool-server boundary."
  type        = string
  default     = "us-central1-docker.pkg.dev/get-spresso/spresso/tool-server:latest"
}
