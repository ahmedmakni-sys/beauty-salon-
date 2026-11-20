import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-start py-16">
      <p className="font-display text-8xl text-brass">404</p>
      <h1 className="mt-4 text-3xl">Cette page n’existe pas</h1>
      <p className="mt-3 max-w-[50ch] text-smoke">L’adresse est peut-être mal saisie, ou la page a été déplacée.</p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Link to="/" className="btn btn-primary">Retour au tableau de bord</Link>
        <Link to="/clients" className="btn btn-ghost">Voir les clients</Link>
      </div>
    </div>
  )
}
