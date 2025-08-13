import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Players')

def handler(event, context):
    """
    Handles new WebSocket connections.
    Associates a connectionId with a sessionId.
    """
    connection_id = event['requestContext']['connectionId']
    query_params = event.get('queryStringParameters', {})
    session_id = query_params.get('sessionId')

    if not session_id:
        return {'statusCode': 400, 'body': 'sessionId is required'}

    print(f"Connecting {connection_id} to session {session_id}")

    try:
        # 1. Add a mapping from connectionId to sessionId for easy lookup on disconnect
        table.put_item(
            Item={
                'PK': f'CONN#{connection_id}',
                'SK': 'SESSION',
                'sessionId': session_id
            }
        )

        # 2. Add the connectionId to the list of connections for the session
        table.update_item(
            Key={'PK': f'SESSION#{session_id}', 'SK': 'META'},
            UpdateExpression="ADD connections :c",
            ExpressionAttributeValues={
                ':c': {connection_id} # Using a Set for connection IDs
            },
            ReturnValues="UPDATED_NEW"
        )

    except ClientError as e:
        print(e.response['Error']['Message'])
        return {'statusCode': 500, 'body': 'Failed to connect.'}

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Successfully connected.'})
    }
