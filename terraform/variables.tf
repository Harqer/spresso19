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
  description = "Container image for the optional Cloud Run tool-server boundary."
  type        = string
  default     = ""
}

variable "enable_tool_server" {
  description = "Deploy the Cloud Run provider/tool boundary after its image and secrets are ready."
  type        = bool
  default     = false
}
