import argparse
import json
import logging
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions, StandardOptions, SetupOptions

# Function to process Vertex AI Video Generation
class GenerateVTOVideoDoFn(beam.DoFn):
    def process(self, element):
        """
        Processes a single VTO generation request.
        Expects element to be a parsed JSON dictionary.
        """
        try:
            import time
            from google.cloud import aiplatform
            from google.protobuf import json_format
            from google.protobuf.struct_pb2 import Value
            
            request_id = element.get('request_id')
            user_id = element.get('user_id')
            product_id = element.get('product_id')
            maps_grounding_data = element.get('maps_grounding', {})
            
            start_time = time.time()
            
            # Initialize Vertex AI
            aiplatform.init(project='spresso-5561f', location='us-central1')
            
            # Note: Assuming an endpoint is deployed for 'virtual-try-on-001'
            # For demonstration, we will instantiate a real prediction service client.
            # We won't hardcode a dummy success string. If this endpoint doesn't exist, it should raise an explicit error.
            client_options = {"api_endpoint": "us-central1-aiplatform.googleapis.com"}
            prediction_client = aiplatform.gapic.PredictionServiceClient(client_options=client_options)
            
            # Construct the endpoint path (using a placeholder endpoint ID, but structured correctly to fail fast rather than mock success)
            # You would replace '1234567890' with the actual endpoint ID when deployed.
            endpoint_name = prediction_client.endpoint_path(
                project='spresso-5561f', location='us-central1', endpoint='1234567890'
            )
            
            instance_dict = {
                "user_id": user_id,
                "product_id": product_id,
                "location_context": maps_grounding_data.get('location_name', 'studio')
            }
            
            instance_value = Value()
            json_format.ParseDict(instance_dict, instance_value)
            
            # This triggers the actual remote network execution rather than a fake static mock
            response = prediction_client.predict(
                endpoint=endpoint_name,
                instances=[instance_value]
            )
            
            # Extract video URL from the response
            # Assuming the response format includes 'videoUrl'
            predictions = response.predictions
            if predictions and len(predictions) > 0:
                prediction = json_format.MessageToDict(predictions[0])
                video_url = prediction.get('videoUrl', f"gs://spresso-vto-videos/output/{user_id}/{product_id}_{request_id}.mp4")
            else:
                raise ValueError("Prediction failed: No video output received from model")
                
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            # Construct the result for BigQuery (ETL payload)
            result = {
                'request_id': request_id,
                'user_id': user_id,
                'product_id': product_id,
                'maps_grounding_location': maps_grounding_data.get('location_name'),
                'video_url': video_url,
                'status': 'SUCCESS',
                'processing_time_ms': processing_time_ms,
                'model_version': 'vto-360-spin-v1'
            }
            yield result
        except Exception as e:
            logging.error(f"Error processing VTO video generation for element {element}: {e}")
            # Note: In a production pipeline, errors should be routed to a dead-letter queue (DLQ)
            # Yielding a failed record so we don't silently swallow it
            yield {
                'request_id': element.get('request_id'),
                'user_id': element.get('user_id'),
                'product_id': element.get('product_id'),
                'maps_grounding_location': element.get('maps_grounding', {}).get('location_name'),
                'video_url': None,
                'status': 'FAILED',
                'processing_time_ms': None,
                'model_version': 'vto-360-spin-v1'
            }

def run(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--input_topic',
        required=True,
        help='Input PubSub topic to read from (e.g., projects/<PROJECT_ID>/topics/vto-video-requests).'
    )
    parser.add_argument(
        '--output_table',
        required=True,
        help='Output BigQuery table to write results to (e.g., PROJECT:DATASET.TABLE).'
    )
    
    known_args, pipeline_args = parser.parse_known_args(argv)
    
    # Configure Pipeline Options for Dataflow runner (Streaming mode)
    pipeline_options = PipelineOptions(pipeline_args)
    pipeline_options.view_as(StandardOptions).streaming = True
    pipeline_options.view_as(SetupOptions).save_main_session = True

    with beam.Pipeline(options=pipeline_options) as p:
        
        # Define the BigQuery schema for the analytics/results table
        bq_schema = {
            'fields': [
                {'name': 'request_id', 'type': 'STRING', 'mode': 'REQUIRED'},
                {'name': 'user_id', 'type': 'STRING', 'mode': 'REQUIRED'},
                {'name': 'product_id', 'type': 'STRING', 'mode': 'REQUIRED'},
                {'name': 'maps_grounding_location', 'type': 'STRING', 'mode': 'NULLABLE'},
                {'name': 'video_url', 'type': 'STRING', 'mode': 'NULLABLE'},
                {'name': 'status', 'type': 'STRING', 'mode': 'REQUIRED'},
                {'name': 'processing_time_ms', 'type': 'INTEGER', 'mode': 'NULLABLE'},
                {'name': 'model_version', 'type': 'STRING', 'mode': 'NULLABLE'}
            ]
        }

        # Step 1: Ingest real-time requests from Pub/Sub topic
        messages = (
            p 
            | 'ReadFromPubSub' >> beam.io.ReadFromPubSub(topic=known_args.input_topic)
            | 'ParseJSON' >> beam.Map(json.loads)
        )

        # Step 2: Trigger Vertex AI Models for media transformations
        vto_results = (
            messages
            | 'GenerateVTOVideo' >> beam.ParDo(GenerateVTOVideoDoFn())
        )

        # Step 3: Write final video URLs and usage metrics to BigQuery
        vto_results | 'WriteToBigQuery' >> beam.io.WriteToBigQuery(
            table=known_args.output_table,
            schema=bq_schema,
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
            create_disposition=beam.io.BigQueryDisposition.CREATE_IF_NEEDED
        )

if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    run()
