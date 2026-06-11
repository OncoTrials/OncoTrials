import React, { useState, useEffect, useRef } from 'react'
import { MapPin, SpinnerGap, CaretDown } from '@phosphor-icons/react'
import { resolveLocation, suggestLocations, MIN_SUGGEST_LENGTH } from '../../geo'

// A toolbar control for filtering the displayed trials by distance from a place.
// It's a button that opens a popover with a location input (postal code, city,
// or address), autocomplete suggestions, and a radius. It is self-contained:
// it owns all its own state and reports the active filter to the parent via
// onChange, so it can sit next to other refinements (keyword search, sort) and
// apply regardless of whether the user searched or is browsing all trials.
//
// onChange is called with either:
//   { lat, lng, formattedAddress, radius, unit }  — an active distance filter
//   null                                          — no location filter
function LocationFilter({ onChange }) {
    const containerRef = useRef(null)
    const [isOpen, setIsOpen] = useState(false)

    // The committed filter: the origin point plus how wide a radius.
    const [activeLocation, setActiveLocation] = useState(null) // { lat, lng, formattedAddress }
    const [radius, setRadius] = useState('50')
    const [unit, setUnit] = useState('miles')

    // Transient input/geocoding/suggestion state (before a location is committed).
    const [inputText, setInputText] = useState('')
    const [status, setStatus] = useState('idle')        // idle | loading | error
    const [errorMessage, setErrorMessage] = useState('')
    const [suggestions, setSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [suggestionsLoading, setSuggestionsLoading] = useState(false)

    const radiusOptions = ['10', '25', '50', '100', '200', '500']
    const unitLabel = unit === 'km' ? 'km' : 'mi'

    // Close the popover when clicking outside it.
    useEffect(() => {
        if (!isOpen) return
        const handleOutsideClick = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleOutsideClick)
        return () => document.removeEventListener('mousedown', handleOutsideClick)
    }, [isOpen])

    // Debounced autocomplete for free-text (city/address) input. Postal codes and
    // short text return [] from suggestLocations, and we skip entirely once a
    // location is committed.
    useEffect(() => {
        if (activeLocation) return
        const query = inputText.trim()
        if (query.length < MIN_SUGGEST_LENGTH) {
            setSuggestions([])
            setShowSuggestions(false)
            return
        }

        const abortController = new AbortController()
        const debounceTimer = setTimeout(() => {
            setSuggestionsLoading(true)
            suggestLocations(query, { signal: abortController.signal })
                .then((results) => {
                    setSuggestions(results)
                    setShowSuggestions(true)
                })
                .catch((err) => {
                    if (err.name !== 'AbortError') setSuggestions([])
                })
                .finally(() => setSuggestionsLoading(false))
        }, 300)

        return () => {
            clearTimeout(debounceTimer)
            abortController.abort()
        }
    }, [inputText, activeLocation])

    // Commit a resolved location as the active filter and report it upward.
    const commitLocation = (location, nextRadius = radius, nextUnit = unit) => {
        setActiveLocation(location)
        setStatus('success')
        setShowSuggestions(false)
        setSuggestions([])
        onChange({
            lat: location.lat,
            lng: location.lng,
            formattedAddress: location.formattedAddress,
            radius: parseFloat(nextRadius) || 50,
            unit: nextUnit,
        })
    }

    // User picked a suggestion — it already carries coordinates.
    const handleSelectSuggestion = (suggestion) => {
        setInputText(suggestion.label)
        commitLocation({ lat: suggestion.lat, lng: suggestion.lng, formattedAddress: suggestion.label })
    }

    // User pressed Enter / clicked "Set" without picking a suggestion.
    const handleSetLocation = async () => {
        const query = inputText.trim()
        if (!query) {
            setErrorMessage('Please enter a location')
            setStatus('error')
            return
        }
        setStatus('loading')
        setErrorMessage('')
        setShowSuggestions(false)
        try {
            const resolved = await resolveLocation(query)
            commitLocation(resolved)
        } catch (err) {
            setErrorMessage(err.message || 'Failed to find location')
            setStatus('error')
            setActiveLocation(null)
        }
    }

    // Typing invalidates the committed location so the filter clears and
    // suggestions resume for the new text.
    const handleInputChange = (value) => {
        setInputText(value)
        if (activeLocation || status !== 'idle') {
            setActiveLocation(null)
            setStatus('idle')
            setErrorMessage('')
            onChange(null)
        }
    }

    // Changing radius/unit re-reports the filter when a location is active.
    const handleRadiusChange = (value) => {
        setRadius(value)
        if (activeLocation) commitLocation(activeLocation, value, unit)
    }
    const handleUnitChange = (value) => {
        setUnit(value)
        if (activeLocation) commitLocation(activeLocation, radius, value)
    }

    const clearLocation = () => {
        setActiveLocation(null)
        setInputText('')
        setStatus('idle')
        setErrorMessage('')
        setSuggestions([])
        setShowSuggestions(false)
        onChange(null)
    }

    const isActive = !!activeLocation
    // Short summary shown on the toolbar button when a filter is active.
    const buttonLabel = isActive
        ? `${radius} ${unitLabel} · ${activeLocation.formattedAddress}`
        : 'Location'

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-xl transition-all duration-200 whitespace-nowrap max-w-[14rem]
                    ${isActive
                        ? 'border-sky-300 bg-sky-50 text-sky-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:bg-sky-50'}`}
            >
                <MapPin size={16} weight={isActive ? 'fill' : 'bold'} className={isActive ? 'text-sky-500' : 'text-gray-400'} />
                <span className="truncate">{buttonLabel}</span>
                <CaretDown size={14} className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-30">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Filter by location</p>

                    {/* Input + Set */}
                    <div className="relative">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700
                                    focus:ring-2 focus:ring-sky-100 focus:border-sky-400 outline-none"
                                placeholder="e.g. 10001, New York, NY"
                                type="text"
                                value={inputText}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSetLocation() } }}
                                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                onClick={handleSetLocation}
                                disabled={status === 'loading' || !inputText.trim()}
                                className="px-3 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-300 disabled:cursor-not-allowed
                                    text-white text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center shrink-0"
                            >
                                {status === 'loading' ? <SpinnerGap size={16} className="animate-spin" /> : 'Set'}
                            </button>
                        </div>

                        {/* Autocomplete suggestions */}
                        {showSuggestions && (suggestionsLoading || suggestions.length > 0) && (
                            <ul className="absolute left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                {suggestionsLoading && suggestions.length === 0 ? (
                                    <li className="px-3 py-2 text-xs text-gray-400 flex items-center gap-1.5">
                                        <SpinnerGap size={14} className="animate-spin" /> Searching…
                                    </li>
                                ) : (
                                    suggestions.map((suggestion, idx) => (
                                        <li key={`${suggestion.label}-${idx}`}>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => handleSelectSuggestion(suggestion)}
                                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-sky-50 flex items-center gap-2"
                                            >
                                                <MapPin size={14} className="text-gray-400 shrink-0" />
                                                <span className="truncate">{suggestion.label}</span>
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </div>

                    {status === 'error' && <p className="text-red-500 text-xs mt-1.5">{errorMessage}</p>}

                    {/* Radius + unit */}
                    <div className="mt-3 flex items-center gap-2">
                        <label className="text-xs text-gray-600 font-medium shrink-0">Within</label>
                        <select
                            value={radius}
                            onChange={(e) => handleRadiusChange(e.target.value)}
                            className="text-sm px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-sky-100 outline-none"
                        >
                            {radiusOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select
                            value={unit}
                            onChange={(e) => handleUnitChange(e.target.value)}
                            className="text-sm px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-sky-100 outline-none"
                        >
                            <option value="miles">miles</option>
                            <option value="km">km</option>
                        </select>
                    </div>

                    {/* Active confirmation + clear */}
                    {isActive && (
                        <div className="mt-3 flex items-start justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <span className="text-xs text-green-700">
                                Showing trials within {radius} {unitLabel} of <span className="font-semibold">{activeLocation.formattedAddress}</span>
                            </span>
                            <button
                                type="button"
                                onClick={clearLocation}
                                className="text-green-500 hover:text-red-500 transition-colors text-xs font-semibold shrink-0"
                            >
                                Clear
                            </button>
                        </div>
                    )}

                    {/* Attribution required by GeoNames (postal data) and OpenStreetMap (suggestions). */}
                    <p className="text-[10px] text-gray-400 mt-2 leading-snug">
                        Location data ©{' '}
                        <a href="https://www.geonames.org/" target="_blank" rel="noreferrer" className="underline hover:text-gray-500">GeoNames</a>
                        {' '}&amp; © OpenStreetMap contributors
                    </p>
                </div>
            )}
        </div>
    )
}

export default LocationFilter
