import {EyebrowLabel} from './HomepageHelpers.jsx';

export const DifferentiatorSection = () => {
    return (
        <section className="px-6 md:px-12 lg:px-20 py-24 ">
            <div className="max-w-6xl mx-auto text-center">
                <p className="text-lg font-semibold uppercase tracking-[0.2em] text-blue-600 mb-3">
                    <EyebrowLabel>What makes TrialsOnco Different</EyebrowLabel>
                </p>

                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight max-w-4xl mx-auto">
                    TrialsOnco doesn’t ask clinicians to search for trials. It brings it to them.
                </h2>

                <p className="mt-8 text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
                    By integrating directly into systems like Epic, TrialsOnco surfaces high-probability matches at the exact moment decisions are being made.
                </p>
            </div>
        </section>
    )
}