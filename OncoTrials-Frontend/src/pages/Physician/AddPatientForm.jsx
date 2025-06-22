import React from 'react'

function AddPatientForm() {
    return (
        <>
            <span className='inline-flex items-center gap-2'><InfoIcon size={12} /><p>'*' means it is required</p></span>
            <div class="w-full max-w-xs p-4 bg-white rounded-lg font-sans">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="age-input">Age</label>
                <input
                    class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                    placeholder="Input age here"
                    type="number"
                    id="age-input"
                    min={0}
                ></input>
            </div>
            <div class="w-full max-w-xs p-5 bg-white rounded-lg font-sans">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="gender-input">Gender</label>
                <select
                    class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                    type="text"
                    id="gender-input"
                >
                    <option value="" disabled>Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-Binary</option>
                </select>
                <p className='text-sm text-gray-700'>Note: think about inclusivity here, which options are best?</p>
            </div>
            <div class="w-full max-w-xs p-5 bg-white rounded-lg font-sans">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="ethnicity-input">Ethnicity</label>
                <select
                    class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                    type="text"
                    id="ethnicity-input"
                    multiple
                >
                    <option value="" > African American</option>
                    <option value="" >Select Ethnicity</option>
                    <option value="" >Select Ethnicity</option>
                    <option value="" >Select Ethnicity</option>
                    <option value="" >Select Ethnicity</option>
                    <option value="" >Select Ethnicity</option>
                </select>
            </div>
            <div class="w-full max-w-xs p-5 bg-white rounded-lg font-sans">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="diagnosis-input">Diagnosis</label>
                <input
                    class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                    placeholder="Enter text here"
                    type="text"
                    id="diagnosis-input"
                />
            </div>
            <div class="w-full max-w-xs p-5 bg-white rounded-lg font-sans">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="cancer-stage-input">Stage</label>
                <select
                    class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                    type="text"
                    id="cancer-stage-input"
                >
                    <option value="stage_1"> Stage I</option>
                    <option value="stage_2" >Stage II</option>
                    <option value="stage_3" >Stage III</option>
                    <option value="stage_4" >Stage IV</option>
                </select>
            </div>
            <div class="w-full max-w-xs p-5 bg-white rounded-lg font-sans">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="cancer-type-input">Cancer Type</label>
                <input
                    class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                    placeholder="Enter text here"
                    type="text"
                    id="cancer-type-input"
                />
            </div>
            <div class="w-full max-w-xs p-5 bg-white rounded-lg font-sans">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="mutation-biomarker-input">Mutation or BioMarker (e.g., EGFR, KRAS)*</label>
                <textarea
                    class="text-sm custom-input w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm transition duration-300 ease-in-out transform focus:-translate-y-1 focus:outline-blue-300 hover:shadow-lg hover:border-blue-300 bg-gray-100"
                    placeholder="Enter text here"
                    type="text"
                    id="mutation-biomarker-input"
                    rows={5}
                />
            </div>
            <div className='flex flex-row items-center justify-center space-x-5'>
                <FormButton text={'Search Trials'} />
                <FormButton text={'Reset'} />
            </div>
        </>
    )
}

export default AddPatientForm