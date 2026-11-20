import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/format'
import { Spinner } from '../components/ui'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    if (!email.trim() || !password) {
      setError('Saisissez votre e-mail et votre mot de passe.')
      return
    }
    setBusy(true)
    setError('')
    const { error: err } = await signIn(email.trim(), password)
    setBusy(false)
    if (err) {
      setError(errorMessage(err))
      return
    }
    navigate(location.state?.from || '/', { replace: true })
  }

  return (
    <div className="salon-photo flex min-h-dvh flex-col justify-end px-5 pt-16 pb-8 sm:px-10 md:justify-center lg:px-20">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <span className="flex size-14 items-center justify-center rounded-full border-2 border-brass font-display text-2xl text-brass-bright">
            B
          </span>
          <h1 className="mt-6 text-5xl leading-[1.05] sm:text-6xl">Beauty Salon</h1>
          <p className="mt-3 max-w-[34ch] text-lg text-marble/85">Cartes de fidélité, visites et récompenses de vos clients.</p>
        </div>

        <form onSubmit={submit} noValidate className="panel space-y-5 bg-panel/90 p-6 backdrop-blur-sm sm:p-7">
          <div className="flex items-center gap-2 text-smoke">
            <LockKeyhole className="size-4" aria-hidden />
            <p className="text-sm">Espace administrateur</p>
          </div>
          <div>
            <label htmlFor="email" className="field-label">E-mail</label>
            <input id="email" type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div>
            <label htmlFor="password" className="field-label">Mot de passe</label>
            <div className="relative">
              <input
                id="password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                className="input pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-smoke hover:text-marble"
                aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-rust" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy && <Spinner className="size-4 text-current" />}
            Se connecter
          </button>
        </form>
      </div>
    </div>
  )
}
