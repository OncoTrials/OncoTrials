import { useState } from "react";
import HomeNavBar from "../components/layout/HomeNavBar";
import PageFooter from "../components/layout/PageFooter";
import { EnvelopeIcon, PhoneIcon } from "@phosphor-icons/react";
import CustomAlert from "../components/common/Alert";
import emailjs from "@emailjs/browser";


export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    organization: "",
    subject: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setStatus("");

    try {
      await emailjs.send(
        import.meta.env.VITE_SERVICE_ID,
        import.meta.env.VITE_TEMPLATE_ID,
        {
          name: formData.firstName + " " + formData.lastName,
          time: new Date(),
          email: formData.email,
          organization: formData.organization,
          subject: formData.subject,
          message: formData.message,
        },
        import.meta.env.VITE_EMAILJS_PUB_KEY
      );

      setStatus("success");

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        organization: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      console.error(error);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };
  const onClose = () => {
    setStatus("");
  }
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-100 blur-3xl opacity-40 rounded-full pointer-events-none" />
      <HomeNavBar />
      <section className="relative z-10 px-6 py-24 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
              Making Clinical Trials
              <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                More Accessible
              </span>
            </h1>

            <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed">
              Whether you're an oncologist, researcher, hospital administrator, or potential partner, we’d love to hear from you. Reach out to learn how TrialsOnco can streamline patient-to-trial matching directly within clinical workflows.
            </p>

            <div className="mt-10 space-y-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                  <EnvelopeIcon size={24} color="blue" />
                </div>

                <div>
                  <p className="font-semibold text-lg">Email</p>
                  <p className="text-gray-600">contact@trialsonco.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                  <PhoneIcon size={24} color="blue" />
                </div>

                <div>
                  <p className="font-semibold text-lg">Schedule a Demo</p>
                  <p className="text-gray-600">See how TrialsOnco integrates into oncology workflows.</p>
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

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="Last Name"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="john.doe@email.com"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization
                  </label>
                  <input
                    type="text"
                    placeholder="Cancer Center / Hospital / Company (optional)"
                    name="organization"
                    value={formData.organization}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Partnership, demo request, or general inquiry"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
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
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-blue-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none disabled:from-blue-400 disabled:to-cyan-400"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Contact TrialsOnco
                  </span>

                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-white/10" />
                </button>
              </form>
              {status.includes("error") && (
                <CustomAlert type={"failure"} message={"There was an error sending your message. Please try again."} onClose={onClose} />
              )}
              {status.includes("success") && (
                (<CustomAlert type={"success"} message={"Message sent successfully."} onClose={onClose} />)
              )}
            </div>
          </div>
        </div>
      </section>
      <PageFooter />
    </div>
  )
}
