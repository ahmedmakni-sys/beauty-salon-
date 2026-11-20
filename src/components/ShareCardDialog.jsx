import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Check, MessageCircle, Printer, ExternalLink, RefreshCw, X } from 'lucide-react'
import { regenerateShareToken } from '../lib/api'
import { cardUrl, errorMessage, whatsappNumber } from '../lib/format'
import { useToast } from '../context/ToastContext'
import { Spinner } from './ui'

const QR_COLORS = { dark: '#15110d', light: '#ece6da' }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

/** Fenêtre QR code + partage de la carte d'un client (côté admin). */
export default function ShareCardDialog({ open, client, salonName, onClose, onTokenChange }) {
  const ref = useRef(null)
  const toast = useToast()
  const [svg, setSvg] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const url = cardUrl(client.share_token)
  const isLocal = /localhost|127\.0\.0\.1/.test(window.location.hostname)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
    if (!open) setConfirmRegen(false)
  }, [open])

  useEffect(() => {
    let active = true
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: QR_COLORS }).then((s) => active && setSvg(s))
    return () => {
      active = false
    }
  }, [url])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copie impossible. Sélectionnez le lien et copiez-le à la main.')
    }
  }

  async function regenerate() {
    setRegenerating(true)
    try {
      const token = await regenerateShareToken(client.id)
      onTokenChange(token)
      setConfirmRegen(false)
      toast.success('Nouveau lien créé. L’ancien lien ne fonctionne plus.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setRegenerating(false)
    }
  }

  function print() {
    const w = window.open('', '_blank')
    if (!w) {
      toast.error('La fenêtre d’impression a été bloquée. Autorisez les fenêtres pop-up pour ce site.')
      return
    }
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Carte de ${escapeHtml(client.full_name)}</title>
<style>
@page { size: 85mm 55mm; margin: 0 }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact }
body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #555 }
.card { width: 85mm; height: 55mm; background: #15110d; color: #ece6da; border-radius: 3mm; padding: 5mm; display: flex; gap: 4mm; font-family: Georgia, 'Times New Roman', serif }
.left { flex: 1; display: flex; flex-direction: column; justify-content: space-between; border: 0.3mm solid #8a6c34; border-radius: 2mm; padding: 3.5mm }
.salon { font-size: 15pt; color: #e2c17c }
.label { font-family: Arial, sans-serif; font-size: 7pt; color: #a89e8f }
.name { font-size: 11pt }
.qr { width: 30mm; display: flex; flex-direction: column; justify-content: center; gap: 1.5mm }
.qr svg { width: 30mm; height: 30mm; border-radius: 1mm }
.hint { font-family: Arial, sans-serif; font-size: 6pt; color: #a89e8f; text-align: center }
@media print { body { background: none; min-height: 0 } }
</style></head><body><div class="card"><div class="left"><div><div class="salon">${escapeHtml(salonName || 'Beauty Salon')}</div><div class="label">Carte de fidélité</div></div><div class="name">${escapeHtml(client.full_name)}</div></div>
<div class="qr">${svg}<div class="hint">Scannez pour voir vos tampons</div></div></div>
<script>window.onload = function () { window.print() }<\/script></body></html>`)
    w.document.close()
  }

  const waMessage = encodeURIComponent(
    `Bonjour ${client.full_name.split(' ')[0]}, voici votre carte de fidélité ${salonName || 'Beauty Salon'} : ${url}`,
  )

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="m-auto w-[min(94vw,32rem)] rounded-[var(--radius-panel)] border border-line bg-panel p-0 text-marble shadow-2xl backdrop:bg-black/70"
      aria-labelledby="share-title"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <h2 id="share-title" className="text-2xl">Carte de {client.full_name}</h2>
          <p className="mt-1 text-sm text-smoke">Le client scanne ce code pour voir ses tampons. Il ne peut rien modifier.</p>
        </div>
        <button className="btn btn-ghost min-h-10 px-3" onClick={onClose} aria-label="Fermer">
          <X className="size-5" />
        </button>
      </div>

      <div className="space-y-4 p-5">
        <div className="mx-auto w-56 overflow-hidden rounded-[10px] border border-brass-deep" role="img" aria-label={`QR code de la carte de ${client.full_name}`}>
          {svg ? <div className="[&_svg]:block [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="flex aspect-square items-center justify-center"><Spinner /></div>}
        </div>

        {isLocal && (
          <p className="rounded-[var(--radius-control)] border border-brass/40 bg-brass/10 px-3 py-2 text-sm text-brass-bright">
            Ce lien pointe vers votre ordinateur (localhost). Il ne s’ouvrira sur le téléphone du client qu’une fois le site mis en ligne.
          </p>
        )}

        <div className="flex gap-2">
          <label htmlFor="card-url" className="sr-only">Lien de la carte</label>
          <input id="card-url" readOnly className="input text-sm" value={url} onFocus={(e) => e.target.select()} />
          <button className="btn btn-ghost shrink-0" onClick={copy} aria-label="Copier le lien">
            {copied ? <Check className="size-4 text-sage" /> : <Copy className="size-4" />}
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <a className="btn btn-primary" href={`https://wa.me/${whatsappNumber(client.phone)}?text=${waMessage}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" aria-hidden />
            Envoyer sur WhatsApp
          </a>
          <button className="btn btn-ghost" onClick={print} disabled={!svg}>
            <Printer className="size-4" aria-hidden />
            Imprimer la carte
          </button>
          <a className="btn btn-ghost sm:col-span-2" href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" aria-hidden />
            Voir la carte comme le client
          </a>
        </div>
      </div>

      <div className="border-t border-line p-5">
        {!confirmRegen ? (
          <button className="flex items-center gap-2 text-sm text-smoke hover:text-marble" onClick={() => setConfirmRegen(true)}>
            <RefreshCw className="size-4" aria-hidden />
            Créer un nouveau lien
          </button>
        ) : (
          <div className="space-y-3" role="alert">
            <p className="text-sm">L’ancien lien et l’ancien QR code ne fonctionneront plus. À faire si le lien a été partagé par erreur.</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-ghost" onClick={() => setConfirmRegen(false)} disabled={regenerating}>Annuler</button>
              <button className="btn btn-danger" onClick={regenerate} disabled={regenerating}>
                {regenerating && <Spinner className="size-4 text-current" />}
                Remplacer le lien
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  )
}
