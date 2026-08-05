import { useEffect, useState } from 'react'
import { getDerivSession } from '@/lib/deriv'

export function useDerivBalance() {
  const [balance, setBalance] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const session = getDerivSession()

    if (!session) {
      setError('Your Deriv session expired. Please log in again.')
      return
    }

    const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=340UoQOIkTBicdefuj36O')

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: session.access_token }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.error) {
        setError(data.error.message)
        localStorage.removeItem('digittool.deriv.session')
        return
      }

      if (data.msg_type === 'authorize') {
        ws.send(JSON.stringify({ balance: 1 }))
      }

      if (data.msg_type === 'balance') {
        setBalance(data.balance.balance)
      }
    }

    ws.onerror = () => setError('Connection failed')

    return () => ws.close()
  }, [])

  return { balance, error }
}
