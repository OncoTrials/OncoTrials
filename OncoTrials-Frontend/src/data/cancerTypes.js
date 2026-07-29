// Cancer type taxonomy sourced from Disease Group.pdf, grouped by category
export const CANCER_TYPES = [
    // Gastrointestinal (GI)
    { category: 'Gastrointestinal (GI)', name: 'Colorectal cancer' },
    { category: 'Gastrointestinal (GI)', name: 'Rectal cancer' },
    { category: 'Gastrointestinal (GI)', name: 'Anal cancer' },
    { category: 'Gastrointestinal (GI)', name: 'Esophageal cancer' },
    { category: 'Gastrointestinal (GI)', name: 'Gastroesophageal junction cancer' },
    { category: 'Gastrointestinal (GI)', name: 'Gastric (stomach) cancer' },
    { category: 'Gastrointestinal (GI)', name: 'Pancreatic cancer' },
    { category: 'Gastrointestinal (GI)', name: 'Hepatocellular carcinoma' },
    { category: 'Gastrointestinal (GI)', name: 'Cholangiocarcinoma' },
    { category: 'Gastrointestinal (GI)', name: 'Gallbladder cancer' },
    { category: 'Gastrointestinal (GI)', name: 'Small bowel adenocarcinoma' },
    { category: 'Gastrointestinal (GI)', name: 'Appendiceal cancer' },
    { category: 'Gastrointestinal (GI)', name: 'Neuroendocrine tumors' },
    { category: 'Gastrointestinal (GI)', name: 'Gastrointestinal stromal tumor' },

    // Breast
    { category: 'Breast', name: 'Breast cancer' },
    { category: 'Breast', name: 'Hormone receptor positive breast cancer' },
    { category: 'Breast', name: 'HER2-positive breast cancer' },
    { category: 'Breast', name: 'Triple-negative breast cancer' },
    { category: 'Breast', name: 'Male breast cancer' },

    // Thoracic
    { category: 'Thoracic', name: 'Lung Cancer' },
    { category: 'Thoracic', name: 'Non-small cell lung cancer' },
    { category: 'Thoracic', name: 'Small cell lung cancer' },
    { category: 'Thoracic', name: 'Mesothelioma' },
    { category: 'Thoracic', name: 'Thymoma/thymic carcinoma' },
    

    // Genitourinary (GU)
    { category: 'Genitourinary (GU)', name: 'Prostate cancer' },
    { category: 'Genitourinary (GU)', name: 'Kidney cancer' },
    { category: 'Genitourinary (GU)', name: 'Bladder cancer' },
    { category: 'Genitourinary (GU)', name: 'Upper tract urothelial carcinoma' },
    { category: 'Genitourinary (GU)', name: 'Penile cancer' },
    { category: 'Genitourinary (GU)', name: 'Testicular cancer' },
    { category: 'Genitourinary (GU)', name: 'Adrenal cortical carcinoma' },

    // Gynecologic
    { category: 'Gynecologic', name: 'Ovarian cancer' },
    { category: 'Gynecologic', name: 'Fallopian tube cancer' },
    { category: 'Gynecologic', name: 'Primary peritoneal cancer' },
    { category: 'Gynecologic', name: 'Endometrial cancer' },
    { category: 'Gynecologic', name: 'Cervical cancer' },
    { category: 'Gynecologic', name: 'Vulvar cancer' },
    { category: 'Gynecologic', name: 'Vaginal cancer' },
    { category: 'Gynecologic', name: 'Gestational trophoblastic neoplasia' },

    // Head and Neck
    { category: 'Head and Neck', name: 'Oral cavity cancer' },
    { category: 'Head and Neck', name: 'Oropharyngeal cancer' },
    { category: 'Head and Neck', name: 'Hypopharyngeal cancer' },
    { category: 'Head and Neck', name: 'Laryngeal cancer' },
    { category: 'Head and Neck', name: 'Nasopharyngeal cancer' },
    { category: 'Head and Neck', name: 'Salivary gland cancer' },
    { category: 'Head and Neck', name: 'Sinonasal cancers' },

    // Skin
    { category: 'Skin', name: 'Melanoma' },
    { category: 'Skin', name: 'Cutaneous squamous cell carcinoma' },
    { category: 'Skin', name: 'Basal cell carcinoma' },
    { category: 'Skin', name: 'Merkel cell carcinoma' },
    { category: 'Skin', name: 'Cutaneous T-cell lymphoma' },

    // Hematologic Malignancies — Leukemias
    { category: 'Hematologic Malignancies', name: 'Acute myeloid leukemia' },
    { category: 'Hematologic Malignancies', name: 'Acute lymphoblastic leukemia' },
    { category: 'Hematologic Malignancies', name: 'Chronic lymphocytic leukemia' },
    { category: 'Hematologic Malignancies', name: 'Chronic myeloid leukemia' },
    { category: 'Hematologic Malignancies', name: 'Hairy cell leukemia' },
    // Hematologic Malignancies — Lymphomas
    { category: 'Hematologic Malignancies', name: 'Diffuse large B-cell lymphoma' },
    { category: 'Hematologic Malignancies', name: 'Follicular lymphoma' },
    { category: 'Hematologic Malignancies', name: 'Mantle cell lymphoma' },
    { category: 'Hematologic Malignancies', name: 'Marginal zone lymphoma' },
    { category: 'Hematologic Malignancies', name: 'Burkitt lymphoma' },
    { category: 'Hematologic Malignancies', name: 'Hodgkin lymphoma' },
    { category: 'Hematologic Malignancies', name: 'T-cell lymphomas' },

    // Plasma Cell Disorders
    { category: 'Plasma Cell Disorders', name: 'Multiple myeloma' },
    { category: 'Plasma Cell Disorders', name: 'Smoldering myeloma' },
    { category: 'Plasma Cell Disorders', name: 'Plasmacytoma' },
    { category: 'Plasma Cell Disorders', name: 'Waldenström macroglobulinemia' },

    // Myeloid Disorders
    { category: 'Myeloid Disorders', name: 'Myelodysplastic syndromes' },
    { category: 'Myeloid Disorders', name: 'Myeloproliferative neoplasms' },
    { category: 'Myeloid Disorders', name: 'Myelofibrosis' },
    { category: 'Myeloid Disorders', name: 'Polycythemia vera' },
    { category: 'Myeloid Disorders', name: 'Essential thrombocythemia' },

    // Sarcoma
    { category: 'Sarcoma', name: 'Soft tissue sarcomas' },
    { category: 'Sarcoma', name: 'Liposarcoma' },
    { category: 'Sarcoma', name: 'Leiomyosarcoma' },
    { category: 'Sarcoma', name: 'Synovial sarcoma' },
    { category: 'Sarcoma', name: 'Undifferentiated pleomorphic sarcoma' },
    { category: 'Sarcoma', name: 'Angiosarcoma' },
    { category: 'Sarcoma', name: 'Osteosarcoma' },
    { category: 'Sarcoma', name: 'Ewing sarcoma' },
    { category: 'Sarcoma', name: 'Chondrosarcoma' },

    // Neuro-Oncology / CNS
    { category: 'Neuro-Oncology / CNS', name: 'Glioblastoma' },
    { category: 'Neuro-Oncology / CNS', name: 'Astrocytoma' },
    { category: 'Neuro-Oncology / CNS', name: 'Oligodendroglioma' },
    { category: 'Neuro-Oncology / CNS', name: 'Ependymoma' },
    { category: 'Neuro-Oncology / CNS', name: 'Meningioma' },
    { category: 'Neuro-Oncology / CNS', name: 'Medulloblastoma' },

    // Endocrine
    { category: 'Endocrine', name: 'Thyroid cancer' },
    { category: 'Endocrine', name: 'Papillary thyroid cancer' },
    { category: 'Endocrine', name: 'Follicular thyroid cancer' },
    { category: 'Endocrine', name: 'Medullary thyroid cancer' },
    { category: 'Endocrine', name: 'Anaplastic thyroid cancer' },
    { category: 'Endocrine', name: 'Parathyroid carcinoma' },

    // Neuroendocrine (Non-GI)
    { category: 'Neuroendocrine (Non-GI)', name: 'Neuroendocrine tumors' },
]
