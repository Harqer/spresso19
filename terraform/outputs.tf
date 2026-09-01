output "project_id" {
  description = "Project receiving the Spresso infrastructure."
  value       = var.project_id
}

output "tool_server_uri" {
  description = "Cloud Run URI for the provider/tool boundary."
  value       = google_cloud_run_v2_service.tool_server.uri
}

output "catalog_database" {
  description = "Spanner database reserved for the global discovery catalog boundary."
  value       = google_spanner_database.catalog_db.name
}
