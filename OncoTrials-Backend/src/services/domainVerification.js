// Domain verification logic, kept DB-agnostic so the only thing tying us to
// Supabase is the query inside fetchOrganization(). Swap that out and the
// rest of the module works against any data source.

const supabase = require('../db/supabaseClient');

const STATUS = Object.freeze({
    VALID: 'valid',       // domain is in the org's valid_domains list
    EXCLUDED: 'excluded', // domain is in excluded_domains (student/alumni)
    UNKNOWN: 'unknown',   // domain matches neither — needs manual review
});

const extractDomain = (email) => {
    if (typeof email !== 'string') return '';
    const at = email.lastIndexOf('@');
    if (at === -1) return '';
    return email.slice(at + 1).trim().toLowerCase();
};

// Fetch only the fields needed for the check. Domain arrays never leave the server.
const fetchOrganization = async (organizationId) => {
    const { data, error } = await supabase
        .from('organizations')
        .select('id, valid_domains, excluded_domains')
        .eq('id', organizationId)
        .single();
    if (error) throw error;
    return data;
};

// Excluded is checked before valid so a domain on both lists is treated as excluded (fail-safe).
const classify = (email, organization) => {
    const domain = extractDomain(email);
    if (!domain || !organization) return STATUS.UNKNOWN;
    const excluded = (organization.excluded_domains ?? []).map((d) => d.toLowerCase());
    const valid = (organization.valid_domains ?? []).map((d) => d.toLowerCase());
    if (excluded.includes(domain)) return STATUS.EXCLUDED;
    if (valid.includes(domain)) return STATUS.VALID;
    return STATUS.UNKNOWN;
};

const checkDomain = async (organizationId, email) => {
    const organization = await fetchOrganization(organizationId);
    return classify(email, organization);
};

// Resolve which organization a user belongs to from their email domain.
// Server-side only — this is what lets routes trust org membership instead of
// a caller-supplied orgId. Excluded domains (student/alumni) never qualify.
// Returns the matching org row ({ id, name }) or null.
const findOrgForEmail = async (email) => {
    const domain = extractDomain(email);
    if (!domain) return null;

    // Domains are stored lowercase; extractDomain lowercases too, so the
    // array-contains prefilter is safe. classify() re-checks the excluded list.
    const { data, error } = await supabase
        .from('organizations')
        .select('id, name, valid_domains, excluded_domains')
        .contains('valid_domains', [domain]);
    if (error) throw error;

    const org = (data ?? []).find((o) => classify(email, o) === STATUS.VALID) || null;
    return org ? { id: org.id, name: org.name } : null;
};

module.exports = { STATUS, checkDomain, classify, extractDomain, findOrgForEmail };
