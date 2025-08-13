import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
table = dynamodb.Table('Players')

player_data = {
    'id': str(0),
    'name': 'John',
    'character': 'Jules, the Captain',
    'escapePod': 'Delta',
    'location': '123',
    'skillTokens': [{'quantity': 0} for _ in range(6)],
    'turn': True,
    'journalText': '',
    'statuses': {'heart': 1, 'star': 1, 'timer_sand_full': 1},
    'impactDiceSlots': []
}

session_code = "123456"
player_id = "player-1"

table.put_item(
    Item={
        'PK': f'SESSION#{session_code}',
        'SK': f'PLAYER#{player_id}',
        **player_data
    }
)

print("Player added!")
