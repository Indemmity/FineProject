import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf", fontWeight: 400 },
    { src: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Bold.ttf", fontWeight: 700 },
    { src: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf", fontStyle: "italic" },
  ],
});

interface ResumeData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  experience?: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education?: Array<{
    degree?: string;
    school?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
  }>;
  skills?: string[];
  projects?: Array<{
    title?: string;
    description?: string;
    technologies?: string[];
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
    date?: string;
  }>;
}

interface OpenResumeTemplateProps {
  data: ResumeData;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.4,
    padding: 40,
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 25,
    textAlign: "center",
    borderBottom: "2px solid #000000",
    paddingBottom: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 10,
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  contact: {
    fontSize: 10,
    color: "#000000",
    marginBottom: 5,
    fontWeight: 500,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 12,
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: "1px solid #000000",
    paddingBottom: 5,
  },
  summary: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 15,
    color: "#333333",
  },
  item: {
    marginBottom: 12,
  },
  itemHeader: {
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#000000",
  },
  itemSubtitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#000000",
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 10,
    color: "#000000",
    fontWeight: 500,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#333333",
  },
  skillsList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  skill: {
    fontSize: 10,
    marginRight: 12,
    marginBottom: 6,
    color: "#000000",
    fontWeight: 500,
  },
  projectItem: {
    marginBottom: 10,
  },
  projectTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#000000",
    marginBottom: 3,
  },
  projectTech: {
    fontSize: 9,
    color: "#666666",
    fontStyle: "italic",
  },
  certItem: {
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  certName: {
    fontSize: 10,
    fontWeight: 600,
    color: "#000000",
  },
  certDetails: {
    fontSize: 9,
    color: "#666666",
  },
});

export function OpenResumeTemplate({ data }: OpenResumeTemplateProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {data.name && <Text style={styles.name}>{data.name}</Text>}
          {(data.email || data.phone || data.location || data.linkedin || data.github) && (
            <Text style={styles.contact}>
              {[data.email, data.phone, data.location, data.linkedin, data.github]
                .filter(Boolean)
                .join(" | ")}
            </Text>
          )}
        </View>

        {/* Summary */}
        {data.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.summary}>{data.summary}</Text>
          </View>
        )}

        {/* Experience */}
        {data.experience && data.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {data.experience.map((exp, index) => (
              <View key={index} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{exp.title}</Text>
                  <Text style={styles.itemSubtitle}>{exp.company}</Text>
                  <Text style={styles.itemDate}>
                    {exp.location && `${exp.location} | `}
                    {[exp.startDate, exp.endDate].filter(Boolean).join(" – ")}
                  </Text>
                </View>
                {exp.description && <Text style={styles.itemDescription}>{exp.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {data.skills && data.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsList}>
              {data.skills.map((skill, index) => (
                <Text key={index} style={styles.skill}>
                  {skill}{index < data.skills!.length - 1 ? "" : ""}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Projects */}
        {data.projects && data.projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {data.projects.map((project, index) => (
              <View key={index} style={styles.projectItem}>
                <Text style={styles.projectTitle}>{project.title}</Text>
                {project.description && (
                  <Text style={styles.itemDescription}>{project.description}</Text>
                )}
                {project.technologies && project.technologies.length > 0 && (
                  <Text style={styles.projectTech}>
                    Technologies: {project.technologies.join(", ")}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {data.certifications.map((cert, index) => (
              <View key={index} style={styles.certItem}>
                <Text style={styles.certName}>{cert.name}</Text>
                <Text style={styles.certDetails}>
                  {cert.issuer && `${cert.issuer}`}
                  {cert.issuer && cert.date && " | "}
                  {cert.date}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {data.education && data.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {data.education.map((edu, index) => (
              <View key={index} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{edu.degree}</Text>
                  <Text style={styles.itemSubtitle}>{edu.school}</Text>
                  <Text style={styles.itemDate}>
                    {edu.location && `${edu.location} | `}
                    {[edu.startDate, edu.endDate].filter(Boolean).join(" – ")}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
