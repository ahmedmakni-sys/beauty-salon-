import { Database } from 'lucide-react'

export default function SetupRequired() {
  return (
    <div className="salon-photo flex min-h-dvh items-center px-5 py-10 sm:px-12">
      <div className="panel max-w-xl bg-panel/95 p-7 sm:p-9">
        <Database className="size-8 text-brass" aria-hidden />
        <h1 className="mt-4 text-3xl">Base de données non configurée</h1>
        <p className="mt-3 text-smoke">
          L’application n’est pas encore reliée à Supabase. Aucune donnée ne peut être lue ni enregistrée tant que
          ce n’est pas fait.
        </p>
        <ol className="mt-6 list-decimal space-y-2 pl-5 text-[0.9375rem]">
          <li>Copiez le fichier <code className="text-brass-bright">.env.example</code> en <code className="text-brass-bright">.env.local</code>.</li>
          <li>Renseignez <code className="text-brass-bright">VITE_SUPABASE_URL</code> et <code className="text-brass-bright">VITE_SUPABASE_ANON_KEY</code>.</li>
          <li>Exécutez les migrations du dossier <code className="text-brass-bright">supabase/migrations</code>.</li>
          <li>Redémarrez avec <code className="text-brass-bright">npm run dev</code>.</li>
        </ol>
        <p className="mt-6 text-sm text-smoke">Le fichier README.md détaille chaque étape.</p>
      </div>
    </div>
  )
}
