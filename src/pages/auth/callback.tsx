import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DerivCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)

    const access_token = params.get('access_token')
    const expires_in = params.get('expires_in')

    if (!access_token) {
      navigate('/login?error=deriv_auth_failed')
      return
    }

    const session = {
      access_token,
      expires_at: Date.now() + Number(expires_in || 3600) * 1000,
    }

    localStorage.setItem('digittool.deriv.session', JSON.stringify(session))

    navigate('/app/dashboard', { replace: true })
  }, [navigate])

  return <div className="p-6 text-white">Connecting Deriv...</div>
}
