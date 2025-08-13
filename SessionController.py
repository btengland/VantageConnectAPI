import boto3
import uuid
import random
import json
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Players')

def generate_unique_code():
    while True:
        code = str(random.randint(100000, 999999))  # 6-digit code
        # Check if this code already exists
        response = table.get_item(
            Key={'PK': f'SESSION#{code}', 'SK': 'META'}
        )
        if 'Item' not in response:  # code not in use
            return code

def create_session():
    session_code = generate_unique_code()

    table.put_item(
        Item={
            'PK': f'SESSION#{session_code}',
            'SK': 'META',
            'challengeDice': 0
        }
    )

    return {
        'statusCode': 200,
        'body': { 'sessionCode': session_code }
    }


def join_session(event):
    session_code = event['pathParameters']['code']
    player_id = str(uuid.uuid4())
    player_data = json.loads(event['body'])  # parse JSON

    table.put_item(
        Item={
            'PK': f'SESSION#{session_code}',
            'SK': f'PLAYER#{player_id}',
            **player_data
        }
    )

    return {
        'statusCode': 200,
        'body': json.dumps({'playerId': player_id})
    }

def update_player(event):
    session_code = event['pathParameters']['code']
    player_id = event['pathParameters']['playerId']
    player_data = json.loads(event['body'])

    table.update_item(
        Key={'PK': f'SESSION#{session_code}', 'SK': f'PLAYER#{player_id}'},
        UpdateExpression="SET " + ", ".join(f"{k}=:{k}" for k in player_data.keys()),
        ExpressionAttributeValues={f":{k}": v for k, v in player_data.items()},
        ReturnValues="ALL_NEW"
    )

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Player updated'})
    }

def get_players(event):
    session_code = event['pathParameters']['code']

    response = table.query(
        KeyConditionExpression=Key('PK').eq(f'SESSION#{session_code}') & Key('SK').begins_with('PLAYER#')
    )

    players = response.get('Items', [])
    return {
        'statusCode': 200,
        'body': json.dumps(players)
    }

def update_challenge_dice(event):
    session_code = event['pathParameters']['code']
    dice_value = json.loads(event['body'])['challengeDice']

    table.update_item(
        Key={'PK': f'SESSION#{session_code}', 'SK': 'META'},
        UpdateExpression="SET challengeDice = :val",
        ExpressionAttributeValues={':val': dice_value}
    )

    return {
        'statusCode': 200,
        'body': json.dumps({'challengeDice': dice_value})
    }
s