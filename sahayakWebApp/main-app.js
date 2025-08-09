import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- START: Firebase Config for Local Development ---
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

const appId = firebaseConfig.projectId;
// --- END: Firebase Config for Local Development ---


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Firestore Emulator Switch: Local vs Production ---
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  console.log("⚡ Using Firestore Emulator (localhost:8080)");
} else {
  console.log("🌐 Using Production Firestore");
}

let currentUserId = null;

// Function to construct Cloud Function URL dynamically
function getFunctionUrl(functionName) {
  const projectId = app.options.projectId;
  const region = 'us-central1'; 

  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
    return `http://127.0.0.1:5001/${projectId}/${region}/${functionName}`;
  } else {
    return `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
    // Get references to elements
    const statusMessageDiv = document.getElementById('status-message');
    const checkConnectionButton = document.getElementById('checkConnectionButton');
    const geminiResponseStoryDiv = document.getElementById('gemini-response-story');
    const loadingIndicatorStory = document.getElementById('loading-indicator-story');
    const generateStoryButton = document.getElementById('generateStoryButton');

    const userPromptInput = document.getElementById('userPromptInput');
    const customGeminiResponseDiv = document.getElementById('custom-gemini-response');
    const loadingIndicatorCustom = document.getElementById('loading-indicator-custom');
    const generateCustomResponseButton = document.getElementById('generateCustomResponseButton');

    const authStatusDiv = document.getElementById('auth-status');
    const userIdDisplay = document.getElementById('user-id-display');
    const knowledgeBaseContainer = document.getElementById('knowledge-base-container');
    const signOutButton = document.getElementById('signOutButton');
    
    const blackboardImageDescriptionInput = document.getElementById('blackboardImageDescription');
    const generateBlackboardImageButton = document.getElementById('generateBlackboardImageButton');
    const loadingIndicatorImage = document.getElementById('loading-indicator-image');
    const blackboardImageResponseDiv = document.getElementById('blackboard-image-response');
    const blackboardImagesContainer = document.getElementById('blackboard-images-container');

    // --- Firebase Authentication Check & Redirection ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            authStatusDiv.innerHTML = `Authenticated! <span class="font-semibold">Email: ${user.email || 'Anonymous'}</span>`;
            userIdDisplay.textContent = currentUserId;
            authStatusDiv.classList.remove('text-red-600');
            authStatusDiv.classList.add('text-blue-700', 'font-semibold');
            signOutButton.classList.remove('hidden');
            console.log("👤 User authenticated:", currentUserId);

            await loadPastQuestionsAndAnswers(currentUserId);
            await loadPastBlackboardImages(currentUserId);
        } else {
            console.log("👤 User not authenticated. Redirecting to login.");
            window.location.href = 'login.html';
        }
    });

    // --- Sign Out Function ---
    async function handleSignOut() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("❌ Sign Out Error:", error);
        }
    }
    
    // --- Firestore Operations for Knowledge Base ---
    async function loadPastQuestionsAndAnswers(userId) {
        if (!userId) {
            knowledgeBaseContainer.innerHTML = '<p class="text-gray-500">Sign in to see your past questions.</p>';
            return;
        }
        const knowledgeBaseCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/knowledgeBase`);
        const q = query(knowledgeBaseCollectionRef, orderBy('timestamp', 'desc'));

        onSnapshot(q, (snapshot) => {
            knowledgeBaseContainer.innerHTML = '';
            if (snapshot.empty) {
                knowledgeBaseContainer.innerHTML = '<p class="text-gray-500">No past questions found.</p>';
                return;
            }
            snapshot.forEach((doc) => {
                const data = doc.data();
                const qaItem = document.createElement('div');
                qaItem.classList.add('bg-white', 'p-4', 'rounded-lg', 'shadow-sm', 'mb-3', 'border', 'border-gray-200');
                qaItem.innerHTML = `
                    <p class="font-semibold text-gray-800 mb-1">Q: ${data.prompt}</p>
                    <p class="text-gray-700 text-sm">A: ${data.response}</p>
                    <p class="text-xs text-gray-500 mt-2">${data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : ''}</p>
                `;
                knowledgeBaseContainer.appendChild(qaItem);
            });
        }, (error) => {
            console.error("❌ Error listening to Firestore knowledge base:", error);
            knowledgeBaseContainer.innerHTML = `<p class="text-red-600">Error loading past questions.</p>`;
        });
    }

    // --- Firestore Operations for Blackboard Images ---
    async function loadPastBlackboardImages(userId) {
    if (!userId) {
        blackboardImagesContainer.innerHTML = '<p class="text-gray-500">Sign in to see your images.</p>';
        return;
    }
    const imagesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/blackboardImages`);
    const q = query(imagesCollectionRef, orderBy('timestamp', 'desc'));

    onSnapshot(q, (snapshot) => {
        blackboardImagesContainer.innerHTML = '';
        if (snapshot.empty) {
            blackboardImagesContainer.innerHTML = '<p class="text-gray-500">No blackboard images found.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const data = doc.data();
            const imgDiv = document.createElement('div');
            imgDiv.classList.add('mb-4', 'p-2', 'bg-white', 'rounded', 'shadow', 'border', 'border-gray-200');
            imgDiv.innerHTML = `
                <img src="${data.image_url}" alt="Blackboard Drawing" class="mx-auto my-2 max-h-48 rounded">
                <p class="text-xs text-gray-700 mt-2"><b>Description:</b> ${data.description}</p>
                <p class="text-xs text-gray-500 mt-1">${data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : ''}</p>
            `;
            blackboardImagesContainer.appendChild(imgDiv);
        });
    }, (error) => {
        console.error("❌ Error loading images:", error);
        blackboardImagesContainer.innerHTML = `<p class="text-red-600">Error loading images.</p>`;
    });
}

    // --- Cloud Function Callers ---
    function checkFirebaseConnection() {
      try {
        if (app && app.options && app.options.projectId) {
          const projectId = app.options.projectId;
          statusMessageDiv.textContent = `Status: Successfully connected! Project ID: ${projectId}`;
          statusMessageDiv.classList.add('bg-green-100', 'text-green-700', 'font-semibold');
          console.log("✅ Firebase app initialized:", app.options.projectId);
        } else {
          throw new Error("App object or Project ID is missing.");
        }
      } catch (error) {
        statusMessageDiv.textContent = `Status: Failed to connect. ${error.message}`;
        statusMessageDiv.classList.add('bg-red-100', 'text-red-600', 'font-semibold');
        console.error("❌ Error checking Firebase connection:", error);
      }
    }
    async function generateAndDisplayStory() {
      console.log('📖 Firing generateAndDisplayStory...');
      loadingIndicatorStory.classList.remove('hidden');
      geminiResponseStoryDiv.textContent = '';
      geminiResponseStoryDiv.classList.remove('text-red-600');

      try {
        const functionUrl = getFunctionUrl('generateMagicBackpackStory');
        console.log(`   - Calling function at: ${functionUrl}`);
        
        const response = await fetch(functionUrl, { method: 'POST' });

        if (!response.ok) {
          const errorResult = await response.json().catch(() => ({ story: `HTTP error! Status: ${response.status}` }));
          throw new Error(errorResult.story);
        }

        const result = await response.json();
        console.log('✅ Story function result received.');
        geminiResponseStoryDiv.textContent = result.story;

      } catch (error) {
        console.error("❌ Error in generateAndDisplayStory:", error);
        geminiResponseStoryDiv.textContent = error.message;
        geminiResponseStoryDiv.classList.add('text-red-600');
      } finally {
        loadingIndicatorStory.classList.add('hidden');
      }
    }

       // --- Main Function to Generate Analogy ---
    async function generateAndDisplayCustomResponse() {
        console.log('🧠 Firing generateAndDisplayCustomResponse...');
        const userPrompt = document.getElementById('userPromptInput').value.trim();
        const region = document.getElementById('regionInput').value.trim();
        const targetLanguage = document.getElementById('languageSelect').value;
        const customGeminiResponseDiv = document.getElementById('custom-gemini-response');
        const loadingIndicatorCustom = document.getElementById('loading-indicator-custom');

        if (!userPrompt || !region) {
            customGeminiResponseDiv.textContent = "Please enter both a topic and a region.";
            return;
        }
        if (!currentUserId) { 
            customGeminiResponseDiv.textContent = "Please sign in to ask a question.";
            return;
        }

        loadingIndicatorCustom.classList.remove('hidden');
        customGeminiResponseDiv.textContent = '';

        const payload = {
            prompt: userPrompt,
            region: region,
            userId: currentUserId,
            targetLanguage: targetLanguage
        };

        try {
            const functionUrl = getFunctionUrl('generateCustomResponse');
            console.log('   - Sending payload:', payload);

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.response || `HTTP error! Status: ${response.status}`);
            }
            
            console.log('✅ Sahayak analogy result received.');
            customGeminiResponseDiv.textContent = result.response;

        } catch (error) {
            console.error("❌ Error in generateAndDisplayCustomResponse:", error);
            customGeminiResponseDiv.textContent = error.message;
        } finally {
            loadingIndicatorCustom.classList.add('hidden');
        }
    }

    async function generateAndDisplayBlackboardImage() {
    console.log('🖼️  Firing generateAndDisplayBlackboardImage...');
    const description = blackboardImageDescriptionInput.value.trim();

    if (!description) {
        blackboardImageResponseDiv.textContent = "Please enter a description for the image.";
        return;
    }
    if (!currentUserId) {
        blackboardImageResponseDiv.textContent = "Please sign in to generate an image.";
        return;
    }

    loadingIndicatorImage.classList.remove('hidden');
    blackboardImageResponseDiv.innerHTML = ''; // Clear previous image or error message
    blackboardImageResponseDiv.classList.remove('text-red-600');

    const payload = { description: description, userId: currentUserId };

    try {
        const functionUrl = getFunctionUrl('generateBlackboardImage');
        console.log(`   - Calling function at: ${functionUrl}`);
        console.log('   - Sending payload:', payload);

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorResult = await response.json().catch(() => ({ imageUrl: `HTTP error! Status: ${response.status}` }));
            throw new Error(errorResult.imageUrl);
        }

        const result = await response.json();
        console.log('✅ Image function result received.');

        if (result.imageUrl && !result.imageUrl.startsWith("Error:")) {
            blackboardImageResponseDiv.innerHTML = `<img src="${result.imageUrl}" alt="Generated blackboard drawing" class="mx-auto my-2 max-h-48 rounded shadow-md">`;
            console.log('   - Image rendered successfully.');
        } else {
            throw new Error(result.imageUrl || "An unknown error occurred on the backend.");
        }
    } catch (error) {
        console.error("❌ Error in generateAndDisplayBlackboardImage:", error);
        blackboardImageResponseDiv.textContent = error.message;
        blackboardImageResponseDiv.classList.add('text-red-600');
    } finally {
        loadingIndicatorImage.classList.add('hidden');
    }
}


    // --- Event Listeners ---
    signOutButton.addEventListener('click', handleSignOut);
    checkConnectionButton.addEventListener('click', checkFirebaseConnection);
    generateStoryButton.addEventListener('click', generateAndDisplayStory);
    generateCustomResponseButton.addEventListener('click', generateAndDisplayCustomResponse);
    generateBlackboardImageButton.addEventListener('click', generateAndDisplayBlackboardImage);

    // Initial check
    checkFirebaseConnection();
});