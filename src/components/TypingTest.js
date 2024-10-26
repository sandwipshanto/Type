import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const TypingTest = () => {
  const [givenText, setGivenText] = useState("");
  const [userInput, setUserInput] = useState('');
  const [mistakes, setMistakes] = useState({
    first: 0,
    second: 0,
    third: 0,
    fourth: 0,
    fifth: 0,
    sixth: 0
  });
  const [timeLeft, setTimeLeft] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef(null);
  const [typingStarted, setTypingStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const mistakeTracker = useRef(null);

  useEffect(() => {
    fetchRandomText();
  }, []);

  useEffect(() => {
    if (givenText) {
      mistakeTracker.current = new Array(givenText.length).fill(false);
      setIsLoading(false);
    }
  }, [givenText]);

  const fetchRandomText = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/texts/random');
      setGivenText(response.data.content);
    } catch (error) {
      console.error('Error fetching text:', error);
      setGivenText("Error loading text. Please refresh the page."); // Fallback text
    }
  };

  const startTimer = () => {
    setIsActive(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    setIsActive(false);
    setIsInputDisabled(true);
    setTestCompleted(true);
  };

  const handleInputChange = (e) => {
    const input = e.target.value;
    if (!typingStarted) {
      setTypingStarted(true);
      startTimer();
    }

    setUserInput(input);

    if (input.length === givenText.length) {
      stopTimer();
      return;
    }

    const segment = Math.floor((60 - timeLeft) / 10);
    const segmentKey = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][segment];

    let newMistakesInSegment = 0;

    input.split('').forEach((char, idx) => {
      if (char !== givenText[idx] && !mistakeTracker.current[idx]) {
        mistakeTracker.current[idx] = true;
        newMistakesInSegment++;
      }
    });

    if (newMistakesInSegment > 0) {
      setMistakes(prev => ({
        ...prev,
        [segmentKey]: prev[segmentKey] + newMistakesInSegment
      }));
    }
  };

  const handleRestartTest = () => {
    setUserInput('');
    setMistakes({
      first: 0,
      second: 0,
      third: 0,
      fourth: 0,
      fifth: 0,
      sixth: 0
    });
    setTimeLeft(60);
    setIsActive(false);
    setIsInputDisabled(false);
    setTypingStarted(false);
    setTestCompleted(false);
    setIsLoading(true);
    fetchRandomText();
  };

  useEffect(() => {
    if (timeLeft === 0 && !testCompleted) {
      stopTimer();
    }
  }, [timeLeft, testCompleted]);

  useEffect(() => {
    if (testCompleted) {
      console.log('Test completed. Posting data to server.');
      postMistakesToServer();
    }
  }, [testCompleted]);

  const postMistakesToServer = async () => {
    try {
      console.log('Posting mistakes to server:', mistakes);
      const response = await axios.post('http://localhost:5000/api/mistakes', mistakes);
      console.log('Server response:', response.data);
    } catch (err) {
      console.error('Error saving mistakes:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>Loading text...</p>
      </div>
    );
  }

  const completionPercentage = Math.round((userInput.length / givenText.length) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="max-w-2xl">
        <div className="text-left font-mono text-xl">
          {givenText.split('').map((char, idx) => (
            <span key={idx} className={userInput[idx] === char ? 'text-green-500' : userInput[idx] ? 'text-red-500' : ''}>
              {char}
            </span>
          ))}
        </div>
        <textarea
          value={userInput}
          onChange={handleInputChange}
          className="opacity-0 absolute"
          autoFocus
          disabled={isInputDisabled}
        />
        <div className="mt-4 space-y-2">
          <p>Time Left: {timeLeft}s</p>
          <p>Completion: {completionPercentage}%</p>
          <p>Mistakes per Segment: {JSON.stringify(mistakes)}</p>
          {testCompleted && (
            <div>
              <p className="text-green-500">Test completed! Data sent to server.</p>
              <button
                onClick={handleRestartTest}
                className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Try Another Text
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TypingTest;