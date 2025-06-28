
// Wrap-up logic fix: ensure user is held on current question until ready or timeout
function startCountdown(secondsLeft) {
    clearTimeout(wrapUpTimeout);
    readyClicked = false;
    readyButton.style.display = "none";
    countdownDiv.style.display = "none";
    readyButton.textContent = "✅ Ready";

    if (secondsLeft <= 0) return;

    let remaining = secondsLeft;
    inWrapUp = false;
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
                countdownDiv.style.display = "block";
                countdownDiv.className = "countdown orange";
                readyButton.style.display = "inline-block";
                countdownDiv.textContent = `⌛ Please wrap up your answer in ${wrapUpTime} seconds`;

                wrapUpTimeout = setInterval(() => {
                    if (readyClicked) {
                        clearInterval(wrapUpTimeout);
                        inWrapUp = false;
                        syncWithTime();
                        return;
                    }
                    wrapUpTime--;
                    countdownDiv.textContent = `⌛ Please wrap up your answer in ${wrapUpTime} seconds`;
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
