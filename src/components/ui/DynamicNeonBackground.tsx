import React, { useState, useEffect } from 'react';
import styles from './DynamicNeonBackground.module.css';

const NEON_COLORS = ['#FF00FF', '#00FFFF', '#39FF14', '#FFFF00', '#FFA500', '#BF00FF'];
const MIN_HOLD_TIME = 5000; // ms
const MAX_HOLD_TIME = 10000; // ms
const MIN_TRANSITION_TIME = 2000; // ms
const MAX_TRANSITION_TIME = 4000; // ms

const getRandomTime = (min: number, max: number) => Math.random() * (max - min) + min;

const getRandomColor = (currentColor?: string): string => {
  let newColor;
  do {
    newColor = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
  } while (newColor === currentColor);
  return newColor;
};

const DynamicNeonBackground: React.FC = () => {
  const [colorTop, setColorTop] = useState(() => getRandomColor());
  const [colorMiddle, setColorMiddle] = useState(() => getRandomColor(colorTop));
  const [colorBottom, setColorBottom] = useState(() => getRandomColor(colorMiddle)); // Ensure initial distinctness for visual appeal

  const [transitionDuration, setTransitionDuration] = useState(getRandomTime(MIN_TRANSITION_TIME, MAX_TRANSITION_TIME));

  useEffect(() => {
    const updateColor = (
      setColor: React.Dispatch<React.SetStateAction<string>>,
      currentColor: string
    ) => {
      const newColor = getRandomColor(currentColor);
      setColor(newColor);
      // Update transition duration for the next cycle
      setTransitionDuration(getRandomTime(MIN_TRANSITION_TIME, MAX_TRANSITION_TIME));
      
      // Schedule next update
      const holdTime = getRandomTime(MIN_HOLD_TIME, MAX_HOLD_TIME);
      const currentTransition = getRandomTime(MIN_TRANSITION_TIME, MAX_TRANSITION_TIME);
      
      const timeoutId = setTimeout(() => {
        updateColor(setColor, newColor);
      }, holdTime + currentTransition);
      return timeoutId;
    };

    const timeoutIdTop = updateColor(setColorTop, colorTop);
    const timeoutIdMiddle = updateColor(setColorMiddle, colorMiddle);
    const timeoutIdBottom = updateColor(setColorBottom, colorBottom);

    return () => {
      clearTimeout(timeoutIdTop);
      clearTimeout(timeoutIdMiddle);
      clearTimeout(timeoutIdBottom);
    };
  }, []); // Rerun only on mount and unmount initially. Subsequent calls are self-scheduled.

  // The key to smooth transitions with linear-gradient is to transition the background property.
  // The browser will then smoothly animate between the old and new gradient definitions.
  return (
    <div
      className={styles.background}
      style={{
        background: `linear-gradient(to bottom, ${colorTop}, ${colorMiddle}, ${colorBottom})`,
        transition: `background ${transitionDuration / 1000}s ease-in-out`,
      }}
    />
  );
};

export default DynamicNeonBackground;
