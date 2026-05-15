import React, { useState, useMemo, useEffect } from 'react';
import { XIcon, EyeClosedIcon, EyeIcon, InfoIcon, CheckIcon, CaretUpDownIcon, WarningIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom';
import PasswordRequirements from '../common/PasswordRequirements';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import supabase from '../../utils/SupabaseClient';
import CustomAlert from '../common/Alert';
import { Turnstile } from "@marsidev/react-turnstile";
import PageFooter from '../layout/PageFooter.jsx'

// Verification states persisted in the user's auth metadata.
//   verified       — domain matched the org's valid_domains; user is auto-approved.
//   pending_manual — domain unknown or excluded; awaits admin review.
//   rejected       — admin reviewed a pending_manual request and denied it.
const VERIFICATION = {
    VERIFIED: 'verified',
    PENDING_MANUAL: 'pending_manual',
    REJECTED: 'rejected',
};

// Mirror of the backend service's STATUS enum. The frontend never reads the
// org's domain lists directly — it just receives one of these verdicts.
const DOMAIN_STATUS = {
    IDLE: 'idle',
    VALID: 'valid',
    EXCLUDED: 'excluded',
    UNKNOWN: 'unknown',
};

// Base URL for our Express backend. Set VITE_API_URL in .env (e.g. http://localhost:5000).
// Trailing slash is stripped so we can safely append `/organizations` etc.
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Fetches the org picker list. Backend returns only id/name/aliases —
// domain arrays stay on the server.
const fetchOrganizations = async () => {
    const res = await fetch(`${API_BASE}/organizations`);
    if (!res.ok) throw new Error(`Failed to load organizations (${res.status})`);
    return res.json();
};

// Asks the backend whether `email` is a valid/excluded/unknown domain for the
// given org. The browser only ever sees the verdict.
const checkDomainOnServer = async (organizationId, email) => {
    const res = await fetch(`${API_BASE}/organizations/check-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, email }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Domain check failed (${res.status})`);
    }
    const { status } = await res.json();
    return status;
};

const createUser = async ({ email, password, role, captchaToken, organizationId, verificationStatus }) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role,
                organization_id: organizationId,
                verification_status: verificationStatus,
            },
            captchaToken,
        }
    });

    if (error) throw error;
    return data;
}

function PhysicianCRCRegisterForm() {
    const [isVisible, setIsVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState("");
    const [captchaToken, setCaptchaToken] = useState(null);
    const [organization, setOrganization] = useState(null);
    const [orgQuery, setOrgQuery] = useState('');
    // Verdict from the backend; set after a successful /check-domain call.
    const [domainStatus, setDomainStatus] = useState(DOMAIN_STATUS.IDLE);
    // Two-step confirmation gate for excluded/unknown domains. Flipped true on
    // the first submit; the second submit then actually creates the account.
    const [manualReviewAck, setManualReviewAck] = useState(false);
    const [checkError, setCheckError] = useState(null);
    const [isChecking, setIsChecking] = useState(false);

    const { data: organizations = [], isLoading: orgsLoading, isError: orgsError } = useQuery({
        queryKey: ['organizations'],
        queryFn: fetchOrganizations,
        staleTime: 1000 * 60 * 10,
    });

    const filteredOrgs = useMemo(() => {
        const q = orgQuery.trim().toLowerCase();
        if (!q) return organizations.slice(0, 100);
        return organizations
            .filter((o) => {
                if (o.name?.toLowerCase().includes(q)) return true;
                return (o.aliases ?? []).some((a) => a.toLowerCase().includes(q));
            })
            .slice(0, 100);
    }, [organizations, orgQuery]);

    // Any change to email or org invalidates the previous verdict — user
    // must hit submit again to re-check.
    useEffect(() => {
        setDomainStatus(DOMAIN_STATUS.IDLE);
        setManualReviewAck(false);
        setCheckError(null);
    }, [email, organization]);

    const createUserMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            setEmail('');
            setPassword('');
            setRole('');
            setOrganization(null);
            setOrgQuery('');
            setManualReviewAck(false);
            setDomainStatus(DOMAIN_STATUS.IDLE);
        },
        onError: (error) => {
            console.error('Error creating user:', error.message);
        },
    });

    const needsManualReview =
        domainStatus === DOMAIN_STATUS.UNKNOWN || domainStatus === DOMAIN_STATUS.EXCLUDED;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password || !role || !organization) return;
        if (createUserMutation.isPending || isChecking) return;

        // If we've already shown the manual-review prompt and the user clicked
        // again, create the account with pending status.
        if (needsManualReview && manualReviewAck) {
            createUserMutation.mutate({
                email,
                password,
                role,
                captchaToken,
                organizationId: organization.id,
                verificationStatus: VERIFICATION.PENDING_MANUAL,
            });
            return;
        }

        // Otherwise (or on first submit), hit the backend to classify the domain.
        setIsChecking(true);
        setCheckError(null);
        try {
            const status = await checkDomainOnServer(organization.id, email);
            setDomainStatus(status);

            if (status === DOMAIN_STATUS.VALID) {
                createUserMutation.mutate({
                    email,
                    password,
                    role,
                    captchaToken,
                    organizationId: organization.id,
                    verificationStatus: VERIFICATION.VERIFIED,
                });
            } else {
                // excluded or unknown: show prompt and wait for a second submit click
                setManualReviewAck(true);
            }
        } catch (err) {
            setCheckError(err.message);
        } finally {
            setIsChecking(false);
        }
    }

    const submitLabel = createUserMutation.isPending
        ? 'Creating Account...'
        : isChecking
            ? 'Checking...'
            : needsManualReview && manualReviewAck
                ? 'Request Manual Verification'
                : 'Create Account';

    return (
        <>
            <div className="flex justify-center items-center min-h-screen animate-fade-down">
                <div className="max-w-sm w-full rounded-lg shadow-lg bg-white p-6 space-y-6 border border-gray-200 mt-20 mb-20">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold">Welcome To TrialsOnco!</h1>

                    </div>
                    <div className="space-y-4">
                        <div className='flex flex-row items-center justify-center gap-1'>
                            <InfoIcon size={12} className='text-gray-600' />
                            <p className="text-gray-600 text-sm">Please use your institutional email</p>
                        </div>
                        <form id='form' method='POST' className='space-y-4' onSubmit={handleSubmit}>
                            {/* Org picker — searchable Combobox over all organizations */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="organization">Organization</label>
                                <Combobox
                                    value={organization}
                                    onChange={(value) => {
                                        setOrganization(value);
                                        setOrgQuery('');
                                    }}
                                    disabled={createUserMutation.isPending || orgsLoading}
                                    nullable
                                >
                                    <div className="relative">
                                        <ComboboxInput
                                            id="organization"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            displayValue={(o) => o?.name ?? ''}
                                            onChange={(e) => setOrgQuery(e.target.value)}
                                            placeholder={orgsLoading ? 'Loading organizations...' : 'Search organizations'}
                                            required
                                        />
                                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                                            <CaretUpDownIcon size={16} className="text-gray-500" />
                                        </ComboboxButton>
                                        <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                            {filteredOrgs.length === 0 && !orgsLoading ? (
                                                <div className="px-3 py-2 text-gray-500">No matches</div>
                                            ) : (
                                                filteredOrgs.map((org) => (
                                                    <ComboboxOption
                                                        key={org.id}
                                                        value={org}
                                                        className={({ active }) =>
                                                            `cursor-pointer select-none px-3 py-2 ${active ? 'bg-blue-100' : ''}`
                                                        }
                                                    >
                                                        {org.name}
                                                    </ComboboxOption>
                                                ))
                                            )}
                                        </ComboboxOptions>
                                    </div>
                                </Combobox>
                                {orgsError && (
                                    <p className="text-xs text-red-600">Could not load organizations. Please refresh.</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="email">Institutional Email</label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    type="email"
                                    id="email"
                                    value={email}
                                    disabled={createUserMutation.isPending}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="john.doe@uchicago.edu"
                                    required
                                />
                            </div>
                            <div className=" relative space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">Password</label>
                                <div>
                                    <input
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        type={isVisible ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        disabled={createUserMutation.isPending}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder='••••••••'
                                        required />
                                    <button type='button' onClick={() => setIsVisible(!isVisible)} className='absolute right-5 top-9'>{isVisible ? (<EyeClosedIcon />) : (<EyeIcon />)}</button>
                                </div>
                            </div>
                            <PasswordRequirements password={password} />
                            <div>
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="confirm-password">Role</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    id="role"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    disabled={createUserMutation.isPending}
                                    required>
                                    <option value="" disabled defaultValue>Select your role</option>
                                    <option value="practitioner">Physician</option>
                                    {/* <option value="crc">Clinical Research Coordinator</option> */}
                                </select>
                            </div>

                            {/* Excluded domain: warn loudly but still offer manual review as an escape hatch */}
                            {manualReviewAck && domainStatus === DOMAIN_STATUS.EXCLUDED && (
                                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 space-y-2">
                                    <div className="inline-flex items-start gap-2">
                                        <WarningIcon size={16} className="mt-0.5 shrink-0" />
                                        <p>
                                            <strong>This isn’t an expected physician address</strong> for {organization?.name}.
                                            That domain is flagged as a student/alumni address. If you believe
                                            this is a mistake, click <strong>Request Manual Verification</strong> to
                                            submit your account for admin review.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {/* Unknown domain: neutral prompt to request manual review */}
                            {manualReviewAck && domainStatus === DOMAIN_STATUS.UNKNOWN && (
                                <div className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800 space-y-2">
                                    <div className="inline-flex items-start gap-2">
                                        <InfoIcon size={16} className="mt-0.5 shrink-0" />
                                        <p>
                                            Your email domain isn’t in our verified list for {organization?.name}.
                                            Click <strong>Request Manual Verification</strong> to submit your
                                            account for admin review.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {checkError && (
                                <p className="text-xs text-red-600">{checkError}</p>
                            )}

                            <button id='submitBtn' type='submit' className="inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 w-full bg-[#4285F4] text-white hover:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed" disabled={createUserMutation.isPending || orgsLoading || isChecking}>
                                {createUserMutation.isPending || isChecking ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        {submitLabel}
                                    </>
                                ) : (
                                    submitLabel
                                )}
                            </button>
                            <Turnstile
                                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                                onSuccess={(token) => {
                                    setCaptchaToken(token)
                                }}
                            />
                        </form>

                        {createUserMutation.isSuccess && (
                            <CustomAlert
                                type="success"
                                message={
                                    createUserMutation.variables?.verificationStatus === VERIFICATION.VERIFIED
                                        ? 'Account created and auto-verified. Please check your email to confirm your address.'
                                        : 'Account created and submitted for manual verification. Please check your email to confirm your address; an admin will review your organization affiliation.'
                                }
                            />
                        )}
                        {createUserMutation.isError && (
                            <CustomAlert type="failure" message={createUserMutation.error.message} />
                        )}
                        <div className='flex justify-center'>
                            <p className='text-sm'>Already have an account? <Link to='/physician-login' className='text-blue-400 hover:underline'>Sign In</Link></p>
                        </div>
                    </div>
                </div>
            </div>
            <PageFooter />
        </>
    );
}

export default PhysicianCRCRegisterForm
