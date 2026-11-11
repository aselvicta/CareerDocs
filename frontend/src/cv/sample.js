/** Realistic sample content used for template thumbnails and the gallery. */
export const SAMPLE_CV = {
  full_name: 'Sarah Kamau',
  headline: 'Junior Data Analyst',
  email: 'sarah.kamau@email.com',
  phone: '+254 712 345 678',
  location: 'Nairobi, Kenya',
  links: [{ label: 'LinkedIn', url: 'linkedin.com/in/sarahkamau' }],
  summary:
    'Data analyst with a BSc in Statistics and two years of hands-on experience turning messy operational data into clear dashboards. Comfortable with SQL, Python and Power BI, and known for explaining numbers to non technical teams.',
  experience_structured: [
    {
      role: 'Data Analyst Intern', company: 'Safaricom PLC', location: 'Nairobi',
      start_date: 'Jun 2024', end_date: '', current: true,
      bullets:
        'Built a Power BI dashboard tracking 40,000 weekly customer tickets, cutting report preparation time by 70%\nAutomated a monthly churn report in Python, saving the retail team six hours a month\nPresented findings to regional managers that shaped the Q3 retention campaign',
    },
    {
      role: 'Research Assistant', company: 'University of Nairobi', location: 'Nairobi',
      start_date: 'Jan 2023', end_date: 'May 2024', current: false,
      bullets:
        'Cleaned and analysed survey data from 1,200 households for a public health study\nWrote reproducible R scripts and documented methods for the research team',
    },
    {
      role: 'Sales Associate', company: 'Naivas Supermarket', location: 'Nairobi',
      start_date: 'Aug 2021', end_date: 'Dec 2022', current: false,
      bullets: 'Tracked daily stock movement in Excel and flagged shortages before weekend peaks',
    },
  ],
  education_structured: [
    {
      degree: 'BSc Statistics, Second Class Upper', institution: 'University of Nairobi', location: 'Nairobi',
      start_date: '2020', end_date: '2024', honors: 'Dissertation: Predicting loan default with gradient boosted trees',
    },
  ],
  skills_structured: [
    { category: 'Analysis', items: 'SQL, Python (pandas), R, Excel' },
    { category: 'Visualisation', items: 'Power BI, Tableau, Matplotlib' },
    { category: 'Ways of working', items: 'Stakeholder reporting, Agile, Data storytelling' },
  ],
  certifications: [
    { name: 'Google Data Analytics Certificate', issuer: 'Coursera', date: '2023' },
    { name: 'Microsoft Power BI Data Analyst', issuer: 'Microsoft', date: '2024' },
  ],
  projects: [
    { name: 'Matatu fare tracker', tech: 'Python, Streamlit', description: 'Crowdsourced fare dashboard used by 300 commuters in its first month' },
  ],
  languages: [
    { language: 'English', proficiency: 'Fluent' },
    { language: 'Swahili', proficiency: 'Native' },
  ],
  awards: [],
  references: [
    { name: 'Dr. James Otieno', title: 'Senior Lecturer', company: 'University of Nairobi', email: 'j.otieno@uonbi.ac.ke', phone: '' },
  ],
}

export const SAMPLE_LETTER = {
  letter_type: 'cover',
  recipient_name: 'Ms. Grace Njoroge',
  recipient_title: 'Head of Analytics',
  company: 'Equity Bank',
  sender_name: 'Sarah Kamau',
  sender_headline: 'Junior Data Analyst',
  sender_email: 'sarah.kamau@email.com',
  sender_phone: '+254 712 345 678',
  sender_location: 'Nairobi, Kenya',
  body:
    'I am writing to apply for the Graduate Data Analyst role advertised on your careers page. With a BSc in Statistics from the University of Nairobi and a year building dashboards at Safaricom, I would bring practical analysis skills and a habit of turning numbers into decisions.\n\nAt Safaricom I built a Power BI dashboard that tracks 40,000 weekly customer tickets and cut reporting time by 70%. I also automated a monthly churn report in Python that the retail team now relies on for planning.\n\nEquity Bank\'s work on financial inclusion is the reason I want to join. I would welcome the chance to discuss how I can support your analytics team.',
}
