import HomeNavBar from "../components/layout/HomeNavBar";
import PageFooter from "../components/layout/PageFooter";

export default function ContactPage() {
    return (
      <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-100 blur-3xl opacity-40 rounded-full pointer-events-none" />
        <HomeNavBar/>
        <section className="relative z-10 px-6 py-24 md:px-12 lg:px-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-sm font-medium mb-6">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Contact OncoTrials
              </div>
  
              <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
                Let’s Improve
                <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  Clinical Trial Matching
                </span>
              </h1>
  
              <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed">
                Whether you're an oncologist, researcher, hospital administrator, or potential partner, we’d love to hear from you. Reach out to learn how OncoTrials can streamline patient-to-trial matching directly within clinical workflows.
              </p>
  
              <div className="mt-10 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6 text-blue-600"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.75 3.857a2.25 2.25 0 01-2.134 0l-6.75-3.857A2.25 2.25 0 013.75 9V8.25m18 0A2.25 2.25 0 0019.5 6h-15A2.25 2.25 0 002.25 8.25m19.5 0v7.5A2.25 2.25 0 0119.5 18h-15a2.25 2.25 0 01-2.25-2.25v-7.5"
                      />
                    </svg>
                  </div>
  
                  <div>
                    <p className="font-semibold text-lg">Email</p>
                    <p className="text-gray-600">contact@oncotrials.com</p>
                  </div>
                </div>
  
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6 text-blue-600"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a1.125 1.125 0 00-1.173.417l-.97 1.293a1.125 1.125 0 01-1.21.38 12.035 12.035 0 01-7.143-7.143 1.125 1.125 0 01.38-1.21l1.293-.97a1.125 1.125 0 00.417-1.173L6.463 3.102A1.125 1.125 0 005.372 2.25H4A1.75 1.75 0 002.25 4v2.75z"
                      />
                    </svg>
                  </div>
  
                  <div>
                    <p className="font-semibold text-lg">Schedule a Demo</p>
                    <p className="text-gray-600">See how OncoTrials integrates into oncology workflows.</p>
                  </div>
                </div>
  
              </div>
            </div>
  
            {/* Contact Form */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-400/10 blur-2xl rounded-[40px]" />
  
              <div className="relative bg-white/90 backdrop-blur-xl border border-gray-200 rounded-[32px] shadow-2xl p-8 md:p-10">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold">Send us a message</h2>
                  <p className="text-gray-600 mt-2">
                    We’re happy to answer questions, discuss partnerships, or walk you through the platform.
                  </p>
                </div>
  
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        placeholder="Jeremiah"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </div>
  
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        placeholder="Smith"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </div>
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Work Email
                    </label>
                    <input
                      type="email"
                      placeholder="you@hospital.org"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization
                    </label>
                    <input
                      type="text"
                      placeholder="Cancer Center / Hospital / Company"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Tell us about your use case, questions, or partnership interest..."
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                    />
                  </div>
  
                  <button
                    type="submit"
                    className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-blue-200"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Contact OncoTrials
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                        />
                      </svg>
                    </span>
  
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-white/10" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
        <PageFooter/>
      </div>
    )
  }
  