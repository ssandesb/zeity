import { useEffect, useState } from 'react'
import {
  getDayOffset,
  getNow,
  getTodayKey,
  isMockTimeEnabled,
  subscribeTime,
} from '../utils/timeProvider'
import { DAY_NAMES } from '../utils/journalDates'

export function useAppTime() {
  const [, bump] = useState(0)

  useEffect(() => subscribeTime(() => bump((n) => n + 1)), [])

  const now = getNow()
  return {
    todayKey: getTodayKey(),
    weekday: DAY_NAMES[now.getDay()],
    mockEnabled: isMockTimeEnabled(),
    dayOffset: getDayOffset(),
    now,
  }
}
