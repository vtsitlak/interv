import json
import os

import firebase_admin
from firebase_admin import credentials


def init_firebase() -> None:
    if firebase_admin._apps:
        return

    key = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
    if key:
        cred = credentials.Certificate(json.loads(key))
    else:
        cred = credentials.ApplicationDefault()

    firebase_admin.initialize_app(cred)
