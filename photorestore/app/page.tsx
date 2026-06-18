import Nav from '@/components/Nav'
import UploadZone from '@/components/UploadZone'
import BeforeAfterSlider from '@/components/BeforeAfterSlider'
import PricingCards from '@/components/PricingCards'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 md:pt-28 md:pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="animate-fadeUp">
            <span className="inline-block text-xs font-semibold text-accent tracking-wide mb-4 border border-accent/20 rounded-full px-3 py-1 bg-accent/5">
              AI Photo Restoration
            </span>
            <h1 className="font-display text-5xl md:text-6xl font-bold text-primary leading-[1.08] mb-6">
              Restore old photos<br />
              <em className="not-italic text-accent">in seconds</em> —<br />
              free.
            </h1>
            <p className="text-text-secondary text-lg leading-relaxed mb-6 max-w-md">
              Upload any damaged, faded, or blurry photo. AI restores it to high resolution instantly — no account, no subscription, no waiting.
            </p>
            {/* Trust pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                '✓ No account',
                '✓ Free to try',
                '✓ High resolution output',
              ].map(pill => (
                <span
                  key={pill}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent"
                >
                  {pill}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <a
                href="#upload"
                className="bg-accent text-white font-semibold rounded-full px-8 py-4 shadow-btn hover:bg-accent-dark hover:shadow-btn-hover hover:-translate-y-0.5 transition-all duration-200"
              >
                Restore a Photo Free
              </a>
              <span className="text-text-muted text-sm">2 free restorations · No credit card</span>
            </div>
            <p className="text-xs opacity-60 mt-2">Have a promo code? <a href="#promo" className="underline">Apply here</a></p>
          </div>
          <div className="animate-fadeUp" style={{ animationDelay: '100ms' }}>
            <BeforeAfterSlider />
            <p className="text-center text-xs text-text-muted mt-3">Drag to compare before &amp; after</p>
          </div>
        </div>
      </section>

      {/* Upload Zone */}
      <section id="upload" className="bg-surface-muted py-10 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-4xl font-bold text-primary mb-3">Try it now</h2>
          <p className="text-text-secondary mb-10 max-w-xl mx-auto">
            Upload your photo and see the AI work its magic. First 2 restorations are completely free.
          </p>
          <UploadZone />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-10 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-14">
            <h2 className="font-display text-4xl font-bold text-primary mb-3">How it works</h2>
            <p className="text-text-secondary max-w-lg">Three steps. Sixty seconds. A lifetime of memories restored.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Upload your photo',
                desc: 'Drag & drop or click to upload. JPG, PNG, or WEBP up to 10MB.',
              },
              {
                step: '02',
                title: 'AI restores it',
                desc: 'Our model fixes scratches, enhances faces, sharpens detail, and adds color.',
              },
              {
                step: '03',
                title: 'Download full quality',
                desc: 'Get your restored photo in full resolution — print-ready, pixel-perfect.',
              },
            ].map(item => (
              <div
                key={item.step}
                className="bg-white rounded-3xl p-8 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
              >
                <span className="font-display text-5xl font-bold text-accent/20 block mb-4">{item.step}</span>
                <h3 className="font-semibold text-primary text-lg mb-2">{item.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-surface-muted py-10 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-14">
            <h2 className="font-display text-4xl font-bold text-primary mb-3">What gets restored</h2>
            <p className="text-text-secondary max-w-lg">Every restoration runs multiple AI passes for the best possible result.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[
              {
                icon: '◎',
                title: 'Face Enhancement',
                desc: 'GFPGAN model rebuilds facial features with stunning clarity.',
              },
              {
                icon: '✦',
                title: 'Scratch & Damage',
                desc: 'Removes tears, stains, creases, and water damage.',
              },
              {
                icon: '◐',
                title: 'Colorization',
                desc: 'Adds natural, realistic color to black-and-white photos.',
              },
              {
                icon: '⬡',
                title: '4× Upscaling',
                desc: 'Real-ESRGAN increases resolution 4× — sharp enough to print large.',
              },
            ].map(f => (
              <div
                key={f.title}
                className="bg-white rounded-3xl p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
              >
                <span className="text-2xl text-accent block mb-3">{f.icon}</span>
                <h3 className="font-semibold text-primary mb-2">{f.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-10 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="font-display text-4xl font-bold text-primary mb-3">Simple pricing</h2>
            <p className="text-text-secondary">Pay only for what you restore. No subscriptions.</p>
          </div>
          <PricingCards />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="font-display text-xl font-bold text-primary block mb-3">PhotoRestore</span>
          <p className="text-text-muted text-sm">
            &copy; {new Date().getFullYear()} PhotoRestore. Powered by GFPGAN &amp; Real-ESRGAN.
          </p>
        </div>
      </footer>
    </main>
  )
}
