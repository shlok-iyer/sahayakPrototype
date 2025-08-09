import google.generativeai as genai
import os
from dotenv import load_dotenv

def list_my_models():
    """
    Connects to the Google AI API and lists all available models
    that support the 'generateContent' method.
    """
    try:
        # Load the API key from your .env file
        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            print("Error: GEMINI_API_KEY not found in .env file.")
            return

        genai.configure(api_key=api_key)

        print("--- Finding Available Models for 'generateContent' ---\n")

        found_models = False
        for m in genai.list_models():
            # We only care about models that can actually generate content
            if 'generateContent' in m.supported_generation_methods:
                print(f"Model Name: {m.name}")
                print(f"  Display Name: {m.display_name}")
                print(f"  Description: {m.description}\n")
                found_models = True

        if not found_models:
            print("No models supporting 'generateContent' were found for your API key.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    list_my_models()