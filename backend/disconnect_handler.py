import json
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
import aws_utils # Our utility for broadcasting

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Players')

def get_session_id_for_connection(connection_id):
    """Finds the session ID associated with a given connection ID."""
    try:
        response = table.get_item(
            Key={'PK': f'CONN#{connection_id}', 'SK': 'SESSION'}
        )
        return response.get('Item', {}).get('sessionId')
    except ClientError as e:
        print(f"Error getting session for connection {connection_id}: {e}")
        return None

def get_session_players(session_id):
    """Fetches all player items for a session."""
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f'SESSION#{session_id}') & Key('SK').begins_with('PLAYER#')
    )
    return response.get('Items', [])

def delete_session(session_id):
    """Deletes all items associated with a session."""
    items_to_delete = []
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f'SESSION#{session_id}')
    )
    items_to_delete.extend(response.get('Items', []))

    with table.batch_writer() as batch:
        for item in items_to_delete:
            batch.delete_item(Key={'PK': item['PK'], 'SK': item['SK']})

    print(f"Deleted session {session_id} and all its items.")


def handler(event, context):
    """
    Handles WebSocket disconnections, cleans up connection data, and
    deletes the session if it's the last user leaving.
    """
    connection_id = event['requestContext']['connectionId']
    print(f"Disconnecting {connection_id}")

    # 1. Find the session the connection belonged to
    session_id = get_session_id_for_connection(connection_id)
    if not session_id:
        print(f"No session found for connection {connection_id}. Nothing to do.")
        return {'statusCode': 200, 'body': 'No session found.'}

    # 2. Clean up the connection -> session mapping
    table.delete_item(Key={'PK': f'CONN#{connection_id}', 'SK': 'SESSION'})

    # 3. Remove the connection from the session's connection list
    try:
        response = table.update_item(
            Key={'PK': f'SESSION#{session_id}', 'SK': 'META'},
            UpdateExpression="DELETE connections :c",
            ExpressionAttributeValues={':c': {connection_id}},
            ReturnValues="ALL_NEW"
        )
        remaining_connections = response.get('Attributes', {}).get('connections', set())
    except ClientError as e:
        print(f"Could not update session meta for {session_id}: {e}")
        return {'statusCode': 500, 'body': 'Failed to update session.'}

    # 4. Check if the session is now empty
    if not remaining_connections:
        print(f"Last user disconnected from session {session_id}. Deleting session.")
        delete_session(session_id)
    else:
        print(f"User disconnected, {len(remaining_connections)} users remain in session {session_id}.")
        # Broadcast the updated player list to the remaining users
        players = get_session_players(session_id)
        broadcast_body = {
            'action': 'userDisconnected',
            'players': players
        }
        aws_utils.broadcast_message(event, remaining_connections, broadcast_body)

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Disconnected and cleaned up successfully.'})
    }
