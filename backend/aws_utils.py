import boto3
import json
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    """
    Custom JSON encoder to handle Decimal and set types from DynamoDB.
    """
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o)
        if isinstance(o, set):
            return list(o)
        return super(DecimalEncoder, self).default(o)

def get_api_gateway_management_api(event):
    """Creates an API Gateway Management API client."""
    domain = event['requestContext']['domainName']
    stage = event['requestContext']['stage']
    endpoint_url = f"https://{domain}/{stage}"

    return boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=endpoint_url
    )

def send_message(event, connection_id, body):
    """Sends a message to a specific connection."""
    try:
        apigw_management_api = get_api_gateway_management_api(event)
        apigw_management_api.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(body, cls=DecimalEncoder).encode('utf-8')
        )
    except Exception as e:
        print(f"Failed to send message to {connection_id}: {e}")

def broadcast_message(event, connection_ids, body):
    """Broadcasts a message to multiple connections."""
    apigw_management_api = get_api_gateway_management_api(event)
    message_data = json.dumps(body, cls=DecimalEncoder).encode('utf-8')
    for connection_id in connection_ids:
        try:
            apigw_management_api.post_to_connection(
                ConnectionId=connection_id,
                Data=message_data
            )
        except Exception as e:
            print(f"Failed to broadcast to {connection_id}: {e}")
