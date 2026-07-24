// Company HR email database
export const COMPANY_HR_EMAILS: Record<string, string[]> = {
  'virtusa': ['careers@virtusa.com', 'hr@virtusa.com', 'recruitment@virtusa.com'],
  'pwc': ['careers@pwc.com', 'pwc.careers@pwc.com', 'recruitment@pwc.com'],
  'synechron': ['careers@synechron.com', 'hr@synechron.com', 'recruitment@synechron.com'],
  'barclays': ['careers@barclays.com', 'recruitment@barclays.com'],
  'teksystems': ['careers@teksystems.com', 'recruitment@teksystems.com'],
  'capgemini': ['careers@capgemini.com', 'recruitment@capgemini.com'],
  'infosys': ['careers@infosys.com', 'recruitment@infosys.com'],
  'accenture': ['careers@accenture.com', 'recruitment@accenture.com'],
  'tcs': ['careers@tcs.com', 'recruitment@tcs.com'],
  'wipro': ['careers@wipro.com', 'recruitment@wipro.com'],
  'hcl': ['careers@hcl.com', 'recruitment@hcl.com'],
  'tech mahindra': ['careers@techmahindra.com', 'recruitment@techmahindra.com'],
  'cognizant': ['careers@cognizant.com', 'recruitment@cognizant.com'],
  'deloitte': ['careers@deloitte.com', 'recruitment@deloitte.com'],
  'kpmg': ['careers@kpmg.com', 'recruitment@kpmg.com'],
  'ey': ['careers@ey.com', 'recruitment@ey.com'],
  'microsoft': ['careers@microsoft.com', 'recruitment@microsoft.com'],
  'google': ['careers@google.com', 'recruitment@google.com'],
  'amazon': ['careers@amazon.com', 'recruitment@amazon.com'],
  'meta': ['careers@meta.com', 'recruitment@meta.com'],
  'apple': ['careers@apple.com', 'recruitment@apple.com'],
  'netflix': ['careers@netflix.com', 'recruitment@netflix.com'],
  'uber': ['careers@uber.com', 'recruitment@uber.com'],
  'airbnb': ['careers@airbnb.com', 'recruitment@airbnb.com'],
  'salesforce': ['careers@salesforce.com', 'recruitment@salesforce.com'],
  'adobe': ['careers@adobe.com', 'recruitment@adobe.com'],
  'oracle': ['careers@oracle.com', 'recruitment@oracle.com'],
  'ibm': ['careers@ibm.com', 'recruitment@ibm.com'],
  'sap': ['careers@sap.com', 'recruitment@sap.com'],
  'cisco': ['careers@cisco.com', 'recruitment@cisco.com'],
  'intel': ['careers@intel.com', 'recruitment@intel.com'],
  'nvidia': ['careers@nvidia.com', 'recruitment@nvidia.com'],
};

export function getCompanyHREmail(companyName: string): string | null {
  const normalizedCompany = companyName.toLowerCase().trim();
  
  // Try exact match first
  if (COMPANY_HR_EMAILS[normalizedCompany]) {
    return COMPANY_HR_EMAILS[normalizedCompany][0] || null;
  }
  
  // Try partial match
  for (const [company, emails] of Object.entries(COMPANY_HR_EMAILS)) {
    if (normalizedCompany.includes(company) || company.includes(normalizedCompany)) {
      return emails[0] || null;
    }
  }
  
  return null;
}

export function getAllCompanyHREmails(companyName: string): string[] {
  const normalizedCompany = companyName.toLowerCase().trim();
  
  // Try exact match first
  if (COMPANY_HR_EMAILS[normalizedCompany]) {
    return COMPANY_HR_EMAILS[normalizedCompany];
  }
  
  // Try partial match
  for (const [company, emails] of Object.entries(COMPANY_HR_EMAILS)) {
    if (normalizedCompany.includes(company) || company.includes(normalizedCompany)) {
      return emails;
    }
  }
  
  return [];
}
