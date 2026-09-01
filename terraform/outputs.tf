output "project_id" {
  description = "Project receiving the Spresso infrastructure."
  value       = var.project_id
}

output "tool_server_uri" {
  description = "Cloud Run URI for the provider/tool boundary."
  value       = var.enable_tool_server ? google_cloud_run_v2_service.tool_server[0].uri : null
}

output "catalog_database" {
  description = "Spanner database reserved for the global discovery catalog boundary."
  value       = google_spanner_database.catalog_db.name
}
