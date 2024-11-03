import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import UserModal from './UserModal';

const backendUrl = process.env.REACT_APP_API_URL;

const TypingTest = () => {
  const [givenText, setGivenText] = useState("");
  const [userInput, setUserInput] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [halfTime, setHalfTime] = useState(120); // 2 minutes default
  const [breakTime, setBreakTime] = useState(30); // 30 seconds default
  const [timeLeft, setTimeLeft] = useState(120);
  const [isBreak, setIsBreak] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const [testHistory, setTestHistory] = useState([]);
  const [charactersTyped, setCharactersTyped] = useState(0);
  const timerRef = useRef(null);
  const mistakeTracker = useRef(null);
  const [firstHalfStats, setFirstHalfStats] = useState(null);
  const [secondHalfStats, setSecondHalfStats] = useState(null);
  const [isSecondHalf, setIsSecondHalf] = useState(false);
  const [userId, setUserId] = useState(null);
  const [metricsInterval, setMetricsInterval] = useState(null);
  const [currentMetrics, setCurrentMetrics] = useState({
    firstHalf: {
      intervals: [],
      totalMistakes: 0,
      totalCharactersTyped: 0
    },
    secondHalf: {
      intervals: [],
      totalMistakes: 0,
      totalCharactersTyped: 0
    }
  });

  useEffect(() => {
    fetchRandomText();
    fetchSettings();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (metricsInterval) {
        clearInterval(metricsInterval);
      }
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${backendUrl}/settings`);
      setHalfTime(response.data.halfTime || 120);
      setBreakTime(response.data.breakTime || 30);
      setTimeLeft(response.data.halfTime || 120);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchRandomText = async () => {
    try {
      const response = await axios.get(`${backendUrl}/texts/random`);
      setGivenText(response.data.content);
      mistakeTracker.current = new Array(response.data.content.length).fill(false);
    } catch (error) {
      console.error('Error fetching text:', error);
      setGivenText("Error loading text. Please refresh the page.");
    }
  };

  const handleUserSubmit = async (data) => {
    try {
      const response = await axios.post(`${backendUrl}/users`, data);
      setUserId(response.data._id);
      setUserData(data);
      setShowModal(false);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const handleInputChange = (e) => {
    const input = e.target.value;

    if (!isActive && input.length > 0 && !isBreak) {
      startTimer();
    }

    setUserInput(input);
    setCharactersTyped(input.length);

    // Check for new mistakes
    let newMistakes = 0;
    input.split('').forEach((char, idx) => {
      if (char !== givenText[idx] && !mistakeTracker.current[idx]) {
        mistakeTracker.current[idx] = true;
        newMistakes++;
      }
    });

    if (newMistakes > 0) {
      setMistakes(prev => prev + newMistakes);
    }
  };

  const startMetricsTracking = () => {
    if (metricsInterval) clearInterval(metricsInterval);

    let startTime = Date.now();
    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const currentHalf = isSecondHalf ? 'secondHalf' : 'firstHalf';

      setCurrentMetrics(prev => ({
        ...prev,
        [currentHalf]: {
          ...prev[currentHalf],
          intervals: [...prev[currentHalf].intervals, {
            timestamp: elapsedSeconds,
            charactersTyped: charactersTyped,
            mistakes: mistakes
          }],
          totalMistakes: mistakes,
          totalCharactersTyped: charactersTyped
        }
      }));
    }, 10000);

    setMetricsInterval(interval);
  };

  const startTimer = () => {
    if (isActive) return;

    setIsActive(true);
    startMetricsTracking();

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          if (isSecondHalf) {
            handleTestComplete();
          } else {
            handleHalfTimeEnd();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleHalfTimeEnd = () => {
    clearInterval(metricsInterval);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsActive(false);
    setIsBreak(true);
    setTimeLeft(breakTime);

    // Save first half stats
    setFirstHalfStats({
      charactersTyped: charactersTyped,
      mistakes: mistakes,
      timeSpent: halfTime
    });

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          startSecondHalf();
          return halfTime;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startSecondHalf = () => {
    setIsBreak(false);
    setIsSecondHalf(true);
    setTimeLeft(halfTime);
    setUserInput('');
    setMistakes(0);
    setCharactersTyped(0);
    mistakeTracker.current = new Array(givenText.length).fill(false);
    fetchRandomText();
  };

  const handleTestComplete = async () => {
    clearInterval(metricsInterval);

    const secondHalfStats = {
      charactersTyped: charactersTyped,
      mistakes: mistakes,
      timeSpent: halfTime
    };

    setSecondHalfStats(secondHalfStats);

    // Only save test data if both halves are complete
    if (firstHalfStats) {
      const testData = {
        userId,
        name: userData.name,
        registrationNumber: userData.registrationNumber,
        department: userData.department,
        timeIntervalStat: halfTime * 2,
        halfTime,
        breakTime,
        charactersTyped: firstHalfStats.charactersTyped + secondHalfStats.charactersTyped,
        mistakes: firstHalfStats.mistakes + secondHalfStats.mistakes,
        firstHalf: {
          charactersTyped: firstHalfStats.charactersTyped,
          mistakes: firstHalfStats.mistakes,
          timeSpent: halfTime
        },
        secondHalf: {
          charactersTyped: secondHalfStats.charactersTyped,
          mistakes: secondHalfStats.mistakes,
          timeSpent: halfTime
        }
      };

      try {
        // Save metrics first
        await axios.post(`${backendUrl}/metrics`, {
          userId,
          firstHalf: currentMetrics.firstHalf,
          secondHalf: currentMetrics.secondHalf,
          halfTime,
          breakTime
        });

        // Then save test summary
        const response = await axios.post(`${backendUrl}/tests`, testData);
        setTestHistory(prev => [...prev, response.data]);
      } catch (error) {
        console.error('Error saving test data:', error);
      }
    }

    resetTestState();
  };

  const resetTestState = () => {
    setUserInput('');
    setMistakes(0);
    setCharactersTyped(0);
    setTimeLeft(halfTime);
    setIsActive(false);
    setIsBreak(false);
    setIsSecondHalf(false);
    setFirstHalfStats(null);
    setSecondHalfStats(null);
    mistakeTracker.current = new Array(givenText.length).fill(false);
    setCurrentMetrics({
      firstHalf: {
        intervals: [],
        totalMistakes: 0,
        totalCharactersTyped: 0
      },
      secondHalf: {
        intervals: [],
        totalMistakes: 0,
        totalCharactersTyped: 0
      }
    });
    fetchRandomText();
  };

  const resetTest = () => {
    if (!isActive && !isBreak) {
      resetTestState();
      return;
    }

    const currentStats = {
      charactersTyped: charactersTyped,
      mistakes: mistakes,
      timeSpent: halfTime - timeLeft
    };

    if (isSecondHalf && firstHalfStats) {
      const testData = {
        userId,
        name: userData.name,
        registrationNumber: userData.registrationNumber,
        department: userData.department,
        timeIntervalStat: (halfTime - timeLeft) + halfTime,
        halfTime,
        breakTime,
        charactersTyped: firstHalfStats.charactersTyped + currentStats.charactersTyped,
        mistakes: firstHalfStats.mistakes + currentStats.mistakes,
        firstHalf: {
          charactersTyped: firstHalfStats.charactersTyped,
          mistakes: firstHalfStats.mistakes,
          timeSpent: halfTime
        },
        secondHalf: {
          charactersTyped: currentStats.charactersTyped,
          mistakes: currentStats.mistakes,
          timeSpent: halfTime - timeLeft
        }
      };

      saveTestData(testData);
    } else if (!isBreak) {
      setFirstHalfStats(currentStats);
    }

    resetTestState();
  };

  const saveTestData = async (testData) => {
    if (!userData || !testData) return;

    try {
      const response = await axios.post(`${backendUrl}/tests`, testData);
      setTestHistory(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error saving test data:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <UserModal isOpen={showModal} onSubmit={handleUserSubmit} />

      {!showModal && (
        <div className="max-w-2xl w-full p-8">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <p>Time Left: {timeLeft}s</p>
              <p>Mistakes: {mistakes}</p>
              <p>Characters Typed: {charactersTyped}</p>
              {isSecondHalf && (
                <p>First Half Characters: {firstHalfStats?.charactersTyped || 0}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={resetTest}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                {isActive || isBreak ? 'End Test' : 'Reset'}
              </button>
            </div>
          </div>

          {isBreak ? (
            <div className="text-center">
              <p className="mb-4">Break Time! Next half will start automatically in {timeLeft} seconds</p>
            </div>
          ) : (
            <>
              <div className="text-left font-mono text-xl mb-4">
                {givenText.split('').map((char, idx) => (
                  <span
                    key={idx}
                    className={
                      userInput[idx] === char
                        ? 'text-green-500'
                        : userInput[idx]
                          ? 'text-red-500'
                          : ''
                    }
                  >
                    {char}
                  </span>
                ))}
              </div>
              <textarea
                value={userInput}
                onChange={handleInputChange}
                className="w-full p-4 bg-gray-800 rounded"
                disabled={isBreak}
                autoFocus
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TypingTest;