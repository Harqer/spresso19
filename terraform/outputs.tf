output "spanner_instance_name" {
  description = "The name of the Cloud Spanner instance"
  value       = google_spanner_instance.global_catalog.name
}

output "agent_engine_staging_bucket" {
  description = "The Cloud Storage bucket used for staging Vertex AI Agent Engine deployments"
  value       = google_storage_bucket.agent_engine_staging.name
}

output "tool_server_url" {
  description = "The URL of the Cloud Run tool server"
  value       = google_cloud_run_v2_service.tool_server.uri
}
