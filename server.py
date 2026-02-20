from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)

ASTROMETRY_URL = 'https://nova.astrometry.net/api'

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    res = requests.post(f'{ASTROMETRY_URL}/login', data={
        'request-json': json.dumps({ 'apikey': data['apikey'] })
    })
    return jsonify(res.json())

@app.route('/upload', methods=['POST'])
def upload():
    session = request.form.get('session')
    file = request.files.get('file')
    
    res = requests.post(f'{ASTROMETRY_URL}/upload', data={
        'request-json': json.dumps({
            'session': session,
            'allow_commercial_use': 'n',
            'allow_modifications': 'n',
            'publicly_visible': 'n'
        })
    }, files={
        'file': (file.filename, file.read(), file.content_type)
    })
    return jsonify(res.json())

@app.route('/submissions/<subid>', methods=['GET'])
def check_submission(subid):
    res = requests.get(f'{ASTROMETRY_URL}/submissions/{subid}')
    return jsonify(res.json())

@app.route('/jobs/<jobid>', methods=['GET'])
def check_job(jobid):
    res = requests.get(f'{ASTROMETRY_URL}/jobs/{jobid}')
    return jsonify(res.json())

@app.route('/jobs/<jobid>/info', methods=['GET'])
def job_info(jobid):
    res = requests.get(f'{ASTROMETRY_URL}/jobs/{jobid}/info')
    return jsonify(res.json())

if __name__ == '__main__':
    app.run(port=5000)