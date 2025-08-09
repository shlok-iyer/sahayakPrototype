from firebase_functions import https_fn
from firebase_functions.options import set_global_options
from firebase_admin import initialize_app
import google.generativeai as genai
import google.generativeai.types as genai_types
import os
import json
import requests
from dotenv import load_dotenv
from firebase_admin import firestore
from firebase_admin import credentials
import firebase_admin
import base64
from deep_translator import GoogleTranslator
from google.cloud import storage
import uuid

# Set global options
set_global_options(max_instances=10)
load_dotenv()

# Initialize Firebase Admin and Firestore for local development
db = None
try:
    if not firebase_admin._apps:
        initialize_app(options={'projectId': 'sahayak2-5ed9b'})
        print("Firebase initialized for local/emulator use.")
    db = firestore.client()
    print("Firestore client initialized successfully.")
except Exception as e:
    print(f"Firebase/Firestore initialization failed: {e}")


# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    print("SUCCESS: Gemini API key found.")
else:
    print("ERROR: Gemini API key not found in environment variables.")


@https_fn.on_request()
def generateMagicBackpackStory(req):
    """
    HTTP Firebase Cloud Function to generate a fixed story about a magic backpack.
    """
    if req.method == 'OPTIONS':
        headers = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '3600'}
        return ('', 204, headers)

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    print("generateMagicBackpackStory function called!")
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = "Introduce yourself as Sahayak a helpful AI teaching assistant.You can generate simple blackboard images and help explain concepts with analogies from regional data"
        response = model.generate_content(prompt)
        return (json.dumps({"story": response.text}), 200, headers)
    except Exception as e:
        print(f"Error in generateMagicBackpackStory: {e}")
        return (json.dumps({"story": f"Error: {str(e)}"}), 500, headers)


@https_fn.on_request()
def generateBlackboardImage(req):
    """
    HTTP Firebase Cloud Function to generate a simple blackboard-style line drawing.
    """
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }

    if req.method == 'OPTIONS':
        preflight_headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, preflight_headers)

    print("generateBlackboardImage function called!")

    try:
        if req.headers.get('Content-Type') != 'application/json':
            return (json.dumps({"imageUrl": "Error: Content-Type must be application/json."}), 415, headers)

        request_json = req.get_json(silent=True)
        if not request_json:
            return (json.dumps({"imageUrl": "Error: Request body is empty or not valid JSON."}), 400, headers)

        description = request_json.get('description', '')
        user_id = request_json.get('userId', None)

        if not description or not user_id:
            return (json.dumps({"imageUrl": "Error: Missing 'description' or 'userId'."}), 400, headers)

        current_api_key = os.environ.get("GEMINI_API_KEY")
        if not current_api_key:
            return (json.dumps({"imageUrl": "Error: API key not found."}), 500, headers)

        # --- START: Final, Corrected Image Generation Logic ---
        genai.configure(api_key=current_api_key)

        imagen_prompt = (
            f"A simple black-and-white line art drawing of a blackboard diagram, using bold, clear chalk-like lines. "
            f"The drawing must illustrate the concept of: {description}."
        )
        print(f"Sending prompt to the image generation model: {imagen_prompt[:100]}...")

        # 3. Instantiate the specific image generation model available to you.
        model = genai.GenerativeModel('models/gemini-2.0-flash-preview-image-generation')

        # 4. Create a dictionary for the special configuration this model requires.
        image_generation_config = {
            "response_modalities": ["IMAGE", "TEXT"]
        }

        # 5. Make the API call, passing the dictionary to the generation_config parameter.
        response = model.generate_content(
            contents=[imagen_prompt],
            generation_config=image_generation_config
        )

        # 6. Parse the response to find the image data.
        image_url = None
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith('image/'):
                    image_bytes = part.inline_data.data
                    image_base64_string = base64.b64encode(image_bytes).decode('utf-8')
                    image_url = f"data:{part.inline_data.mime_type};base64,{image_base64_string}"
                    break

        if not image_url:
            print(f"No image data found. Response from API: {response.text}")
            raise Exception("No image data found in the API response.")

        # --- END: Final, Corrected Image Generation Logic ---

        print("Blackboard image generated successfully!")

        if db:
            try:
                app_id = os.environ.get('FIREBASE_PROJECT_ID', 'sahayak2-5ed9b')
                images_ref = db.collection(f"artifacts/{app_id}/users/{user_id}/blackboardImages")
                images_ref.add({'description': description, 'image_url': image_url, 'timestamp': firestore.SERVER_TIMESTAMP})
                print("Blackboard image saved to Firestore.")
            except Exception as db_error:
                print(f"Error saving blackboard image to Firestore: {db_error}")

        return (json.dumps({"imageUrl": image_url}), 200, headers)

    except Exception as e:
        print(f"Error generating blackboard image: {e}")
        return (json.dumps({"imageUrl": f"Error: {str(e)}"}), 500, headers)