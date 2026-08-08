import { useState, useEffect } from 'react'

// Persists React state to localStorage under `key`, seeded with
// `initialValue` the first time the app runs on a fresh browser.
export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch (err) {
      console.warn(`Could not read localStorage key "${key}"`, err)
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (err) {
      console.warn(`Could not write localStorage key "${key}"`, err)
    }
  }, [key, value])

  return [value, setValue]
}
