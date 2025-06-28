
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDUHUzudvgHeKji4RvSuCcl1OztZLjD72s",
  authDomain: "wedding-songs-trivia.firebaseapp.com",
  projectId: "wedding-songs-trivia",
  storageBucket: "wedding-songs-trivia.firebasestorage.app",
  messagingSenderId: "751255437014",
  appId: "1:751255437014:web:773a27f6538b243bff9377",
  measurementId: "G-S68R3F2H5P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM elements
const statusDiv = document.getElementById("status");
const questionsDiv = document.getElementById("questions");
const countdownDiv = document.getElementById("countdown");
const readyButton = document.getElementById("readyButton");

let questionSets = [];
let currentSetIndex = -1;
let readyClicked = false;
let wrapUpTimeout = null;
let inWrapUp = false;

// Render a single question
function renderQuestion(id, text, type, options) {
  const container = document.createElement("div");
  container.className = "question-block";

  const question = document.createElement("p");
  question.textContent = `${id}. ${text}`;
  container.appendChild(question);

  if (type === "multiple" && Array.isArray(options)) {
    options.forEach(opt => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `q${id}`;
      input.value = opt;
      label.appendChild(input);
      label.appendChild(document.createTextNode(opt));
      container.appendChild(label);
      container.appendChild(document.createElement("br"));
    });
  } else if (type === "shortAnswer") {
    const input = document.createElement("input");
    input.type = "text";
    input.name = `q${id}`;
    container.appendChild(input);
  }

  questionsDiv.appendChild(container);
}

// Load all question sets
async function loadQuestionSets() {
  const snapshot = await getDocs(collection(db, "questions"));
  const sets = [];
  snapshot.forEach(doc => {
    sets.push({ id: doc.id, data: doc.data() });
  });
  sets.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  questionSets = sets;
}

// Determine which question set to show based on elapsed time
function getCurrentSetIndex(elapsedSeconds) {
  let total = 0;
  for (let i = 0; i < questionSets.length; i++) {
    const duration = questionSets[i].data.duration || 30;
    total += duration;
    if (elapsedSeconds < total) return i;
  }
  return -1;
}

// Display the current question set
function displayQuestionSet(index, elapsedInSet, totalDuration) {
  const set = questionSets[index];
  questionsDiv.innerHTML = "";
  const data = set.data;
  const questionIds = Object.keys(data).filter(k => k.startsWith("q")).sort();

  questionIds.forEach(qKey => {
    const num = qKey.replace("q", "");
    const text = data[qKey];
    const type = data[`type${num}`];
    const options = data[`options${num}`];
    renderQuestion(num, text, type, options);
  });

  // Start countdown
  startCountdown(totalDuration - elapsedInSet);
}

// Start countdown and handle ready/wrap-up logic
function startCountdown(secondsLeft) {
  clearTimeout(wrapUpTimeout);
  readyClicked = false;
  readyButton.style.display = "none";
  countdownDiv.style.display = "none";

  if (secondsLeft <= 0) return;

  let remaining = secondsLeft;
  countdownDiv.textContent = `⏳ ${remaining} seconds remaining`;

  const interval = setInterval(() => {
    remaining--;
    countdownDiv.textContent = `⏳ ${remaining} seconds remaining`;

    if (remaining === 60) {
      countdownDiv.style.display = "block";
      countdownDiv.className = "countdown yellow";
      readyButton.style.display = "inline-block";
    }

    if (remaining <= 0) {
      clearInterval(interval);
      if (readyClicked) {
        countdownDiv.textContent = "✅ Moving to next question...";
        countdownDiv.className = "countdown green";
        setTimeout(syncWithTime, 1000);
      } else {
        inWrapUp = true;
        let wrapUpTime = 30;
        wrapUpTimeout = setInterval(() => {
          if (readyClicked) {
            clearInterval(wrapUpTimeout);
            inWrapUp = false;
            syncWithTime();
            return;
          }

          countdownDiv.textContent = `⌛ Please wrap up your answer in ${wrapUpTime} seconds`;
          countdownDiv.className = "countdown orange";
          wrapUpTime--;

          if (wrapUpTime < 0) {
            clearInterval(wrapUpTimeout);
            inWrapUp = false;
            syncWithTime();
          }
        }, 1000);
      }
    }
  }, 1000);
}

// Sync display with gameStartTime
async function syncWithTime() {
  const configDoc = await getDoc(doc(db, "gameConfig", "state"));
  const config = configDoc.data();
  if (!config || !config.gameStarted || !config.gameStartTime) return;

  const startTime = config.gameStartTime.toDate();
  const now = new Date();
  const elapsed = Math.floor((now - startTime) / 1000);
  const index = getCurrentSetIndex(elapsed);

  if (index === -1 || index >= questionSets.length) {
    statusDiv.textContent = "🎊 Game Over!";
    questionsDiv.innerHTML = "<p>Thanks for playing!</p>";
    countdownDiv.style.display = "none";
    readyButton.style.display = "none";
    return;
  }

  if (index !== currentSetIndex) {
    currentSetIndex = index;
    const totalDuration = questionSets[index].data.duration || 30;
    const elapsedInSet = elapsed - questionSets.slice(0, index).reduce((sum, q) => sum + (q.data.duration || 30), 0);
    displayQuestionSet(index, elapsedInSet, totalDuration);
  }
}

// Ready button toggle
readyButton.onclick = () => {
  readyClicked = !readyClicked;
  if (readyClicked) {
    readyButton.textContent = "✅ Ready (Click to Cancel)";
    countdownDiv.className = "countdown green";

    // If in wrap-up, advance immediately
    if (inWrapUp) {
      clearInterval(wrapUpTimeout);
      syncWithTime();
    }
  } else {
    readyButton.textContent = "✅ Ready";
    countdownDiv.className = "countdown yellow";
  }
};


// Listen for game start
onSnapshot(doc(db, "gameConfig", "state"), async (docSnap) => {
  const data = docSnap.data();
  if (data && data.gameStarted && data.gameStartTime) {
    statusDiv.textContent = "🎉 Game Started!";
    questionsDiv.style.display = "block";
    await loadQuestionSets();
    syncWithTime();
    setInterval(syncWithTime, 5000); // Check every 5 seconds
  } else {
    statusDiv.textContent = "Waiting for the game to start...";
    questionsDiv.style.display = "none";
    countdownDiv.style.display = "none";
    readyButton.style.display = "none";
  }
});
