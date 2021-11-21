from flask import Flask, render_template, request
import numpy as np
import requests
import json
import api_key
from cwt import cwtize

app = Flask(__name__)

@app.route('/request/uploadData/', methods=['POST'])
def test():
    reds = request.json['redChannel']
    times = request.json['times']
    result = cwtize(reds, times)
    request_result = upload_to_fihr(result)
    return str(result["heart_rate"])

@app.route('/leaderboard/', methods=['GET', 'POST'])
def get_data():
    url = 'https://fhir.4mnpyf6zvjy9.static-test-account.isccloud.io/Observation'
    headers = {'x-api-key': api_key.get_api_key(), "Content-Type": "application/fhir+json"}
    
    result = requests.get(url, headers=headers)
    jsondict = json.loads(result.text)
    entries = jsondict["entry"]
    returned_text = ""
    for entry in entries:
        returned_text += entry["resource"]["id"]+": "+str(entry["resource"]["component"][0]["valueQuantity"]["value"])+"bpm<br>"
    return returned_text

@app.route('/<string:page_name>/')
def render_static(page_name):
    return render_template('%s' % page_name)

@app.route("/")
def hello():
    return render_template('index.html')

def upload_to_fihr(result):
    a_arrstr = np.char.mod('%f', result["peaks_time"])
    b_arrstr = np.char.mod('%f', result["peaks_amplitude"])
    peaks = " ".join(a_arrstr)
    amplitudes = " ".join(b_arrstr)
    dict = {
        "resourceType": "Observation",
        "id": "60s-smartphone-ppg",
        "status": "final",
        "code": {
            "coding": [{
                "system": "http://loinc.org",
                "code": "?",
                "display": "60s smartphone ppg"
            }]
        },
        "text": {
            "status": "generated",
            "div": "60s-smartphone-ppg"
        },
        "component": [{
                "code": {
                    "coding": [{
                        "system": "-",
                        "code": "?",
                        "display": "ppg heart rate"
                    }]
                },
                "valueQuantity": {
                    "value": result["heart_rate"],
                    "unit": "bpm"
                }
            },
            {
                "code": {
                    "coding": [{
                        "system": "http://loinc.org",
                        "code": "18505-8",
                        "display": "ppg peak times"
                    }]
                },
                "valueSampledData": {
                    "origin": {
                        "value": 0
                    },
                    "period": 10,
                    "dimensions": 1,
                    "data": peaks
                }
            },
            {
                "code": {
                    "coding": [{
                        "system": "http://loinc.org",
                        "code": "9988-7",
                        "display": "ppg peak amplitudes"
                    }]
                },
                "valueSampledData": {
                    "origin": {
                        "value": 0
                    },
                    "period": 10,
                    "dimensions": 1,
                    "data": amplitudes
                }
            }
        ]
    }
    data = json.dumps(dict)
    url = 'https://fhir.4mnpyf6zvjy9.static-test-account.isccloud.io/Observation'
    headers = {'x-api-key': api_key.get_api_key(), "Content-Type": "application/fhir+json"}
    result = requests.post(url, headers=headers, data=data)
    print(result.text)
    return result.text
