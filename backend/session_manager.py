import boto3
import uuid
import random
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Players')

def generate_unique_code():
    """Generates a 6-digit unique session code."""
    while True:
        code = str(random.randint(100000, 999999))
        response = table.get_item(Key={'PK': f'SESSION#{code}', 'SK': 'META'})
        if 'Item' not in response:
            return code

def get_game_state(session_id):
    """Retrieves the entire state for a given session. Raw, with Decimals and sets."""
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f'SESSION#{session_id}')
    )
    items = response.get('Items', [])

    session_meta = {}
    players = []

    for item in items:
        if item['SK'] == 'META':
            session_meta = item
        elif item['SK'].startswith('PLAYER#'):
            players.append(item)

    players.sort(key=lambda p: p['SK'])

    return {
        'sessionId': session_id,
        'challengeDice': session_meta.get('challengeDice', 0),
        'players': players,
        'connections': session_meta.get('connections', set())
    }

def create_session():
    """Creates a new game session and returns the code."""
    session_code = generate_unique_code()
    table.put_item(
        Item={
            'PK': f'SESSION#{session_code}',
            'SK': 'META',
            'challengeDice': 0,
            'connections': set()
        }
    )
    return session_code

def join_session(session_id, player_data):
    """Adds a player to a session and returns their new ID."""
    player_id = str(uuid.uuid4())
    player_data['id'] = player_id
    table.put_item(
        Item={
            'PK': f'SESSION#{session_id}',
            'SK': f'PLAYER#{player_id}',
            **player_data
        }
    )
    return player_id

def update_player(session_id, player_id, player_data):
    """Updates a player's data."""
    player_data.pop('PK', None)
    player_data.pop('SK', None)

    update_expression = "SET " + ", ".join(f"#{k}=:{k}" for k in player_data.keys())
    expression_attribute_values = {f":{k}": v for k, v in player_data.items()}
    expression_attribute_names = {f"#{k}": k for k in player_data.keys()}

    table.update_item(
        Key={'PK': f'SESSION#{session_id}', 'SK': f'PLAYER#{player_id}'},
        UpdateExpression=update_expression,
        ExpressionAttributeValues=expression_attribute_values,
        ExpressionAttributeNames=expression_attribute_names
    )

def update_challenge_dice(session_id, dice_value):
    """Updates the challenge dice for a session."""
    table.update_item(
        Key={'PK': f'SESSION#{session_id}', 'SK': 'META'},
        UpdateExpression="SET challengeDice = :val",
        ExpressionAttributeValues={':val': int(dice_value)}
    )

def next_turn(session_id):
    """Passes the turn to the next player."""
    game_state = get_game_state(session_id)
    players = game_state['players']

    if not players:
        return

    current_turn_index = -1
    for i, player in enumerate(players):
        if player.get('turn'):
            current_turn_index = i
            break

    if current_turn_index != -1:
        current_player = players[current_turn_index]
        table.update_item(
            Key={'PK': current_player['PK'], 'SK': current_player['SK']},
            UpdateExpression="SET turn = :val",
            ExpressionAttributeValues={':val': False}
        )

    next_turn_index = (current_turn_index + 1) % len(players)
    next_player = players[next_turn_index]
    table.update_item(
        Key={'PK': next_player['PK'], 'SK': next_player['SK']},
        UpdateExpression="SET turn = :val",
        ExpressionAttributeValues={':val': True}
    )
