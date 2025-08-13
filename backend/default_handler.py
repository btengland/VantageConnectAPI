import json
import boto3
import aws_utils
import session_manager

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Players')

def handler(event, context):
    """
    Main handler for routing all game-related actions.
    """
    connection_id = event['requestContext']['connectionId']
    body = json.loads(event.get('body', '{}'))
    action = body.get('action')
    payload = body.get('payload', {})

    print(f"Received action '{action}' from {connection_id} with payload: {payload}")

    # For most actions, we'll need the session_id.
    # It's either in the payload or we need to look it up from the connectionId.
    session_id = payload.get('sessionId')
    if not session_id:
        # Look up the session ID from the connection
        response = table.get_item(Key={'PK': f'CONN#{connection_id}', 'SK': 'SESSION'})
        session_id = response.get('Item', {}).get('sessionId')

    if not session_id and action not in ['createSession']:
        return aws_utils.send_message(event, connection_id, {'error': 'sessionId not found and is required for this action.'})

    # --- ACTION ROUTING ---

    if action == 'createSession':
        new_session_id = session_manager.create_session()
        # The creator needs to connect to this session.
        # We can't do that here, but we can send them the ID
        # so they can reconnect with the right query param.
        aws_utils.send_message(event, connection_id, {
            'action': 'sessionCreated',
            'sessionId': new_session_id
        })
        return {'statusCode': 200}

    elif action == 'joinSession':
        player_data = payload.get('playerData', {})
        session_manager.join_session(session_id, player_data)

    elif action == 'updatePlayer':
        player_data = payload.get('playerData', {})
        player_id = player_data.get('id')
        # Simple security check: In a real app, you might map connectionId to playerId
        # upon join to ensure only the user can update their own data.
        # For now, we trust the client to send the right player_id.
        session_manager.update_player(session_id, player_id, player_data)

    elif action == 'updateDice':
        dice_value = payload.get('challengeDice')
        session_manager.update_challenge_dice(session_id, dice_value)

    elif action == 'nextTurn':
        session_manager.next_turn(session_id)

    else:
        aws_utils.send_message(event, connection_id, {'error': f"Unknown action: {action}"})
        return {'statusCode': 400}

    # After every successful action that modifies state,
    # get the full game state and broadcast it to everyone.
    if session_id:
        game_state = session_manager.get_game_state(session_id)
        broadcast_body = {
            'action': 'gameStateUpdate',
            'gameState': game_state
        }
        aws_utils.broadcast_message(event, game_state['connections'], broadcast_body)

    return {'statusCode': 200}
