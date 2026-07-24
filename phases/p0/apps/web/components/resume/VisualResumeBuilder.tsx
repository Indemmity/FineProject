"use client";

import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, X, GripVertical, Download, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Minus, Palette, Layout } from "lucide-react";
import type { ResumeData } from "@jobplatform/shared/lib/resume/extractor";

interface ResumeSection {
  id: string;
  type: 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'divider' | 'spacer';
  title: string;
  content: any;
  styles: SectionStyles;
  visible: boolean;
}

interface SectionStyles {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  backgroundColor: string;
  color: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: 'none' | 'solid' | 'dashed' | 'dotted';
  lineHeight: number;
  letterSpacing: number;
}

interface VisualResumeBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: ResumeData;
  onExport: (data: ResumeData) => void;
  resumeId?: string;
}

export function VisualResumeBuilder({ isOpen, onClose, initialData, onExport, resumeId }: VisualResumeBuilderProps) {
  const [sections, setSections] = useState<ResumeSection[]>([]);

  useEffect(() => {
    console.log('Visual Builder initialData:', initialData);
    setSections([
      {
        id: 'header',
        type: 'header',
        title: 'Header',
        content: {
          name: initialData.name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          location: initialData.location || '',
          linkedin: initialData.linkedin || '',
          github: initialData.github || '',
        },
        styles: {
          fontSize: 24,
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: 0,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0,
          paddingTop: 20,
          paddingBottom: 20,
          paddingLeft: 20,
          paddingRight: 20,
          backgroundColor: '#ffffff',
          color: '#000000',
          borderColor: '#000000',
          borderWidth: 0,
          borderStyle: 'none',
          lineHeight: 1.2,
          letterSpacing: 0,
        },
        visible: true,
      },
      {
        id: 'summary',
        type: 'summary',
        title: 'Professional Summary',
        content: initialData.summary || '',
        styles: {
          fontSize: 12,
          fontWeight: 'normal',
          textAlign: 'left',
          marginTop: 10,
          marginBottom: 15,
          marginLeft: 0,
          marginRight: 0,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 10,
          paddingRight: 10,
          backgroundColor: '#ffffff',
          color: '#000000',
          borderColor: '#000000',
          borderWidth: 0,
          borderStyle: 'none',
          lineHeight: 1.4,
          letterSpacing: 0,
        },
        visible: !!initialData.summary,
      },
      {
        id: 'experience',
        type: 'experience',
        title: 'Experience',
        content: initialData.experience || [],
        styles: {
          fontSize: 11,
          fontWeight: 'normal',
          textAlign: 'left',
          marginTop: 15,
          marginBottom: 15,
          marginLeft: 0,
          marginRight: 0,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 10,
          paddingRight: 10,
          backgroundColor: '#ffffff',
          color: '#000000',
          borderColor: '#000000',
          borderWidth: 0,
          borderStyle: 'none',
          lineHeight: 1.4,
          letterSpacing: 0,
        },
        visible: (initialData.experience?.length || 0) > 0,
      },
      {
        id: 'skills',
        type: 'skills',
        title: 'Skills',
        content: initialData.skills || [],
        styles: {
          fontSize: 11,
          fontWeight: 'normal',
          textAlign: 'left',
          marginTop: 15,
          marginBottom: 15,
          marginLeft: 0,
          marginRight: 0,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 10,
          paddingRight: 10,
          backgroundColor: '#ffffff',
          color: '#000000',
          borderColor: '#000000',
          borderWidth: 0,
          borderStyle: 'none',
          lineHeight: 1.4,
          letterSpacing: 0,
        },
        visible: (initialData.skills?.length || 0) > 0,
      },
      {
        id: 'projects',
        type: 'projects',
        title: 'Projects',
        content: initialData.projects || [],
        styles: {
          fontSize: 11,
          fontWeight: 'normal',
          textAlign: 'left',
          marginTop: 15,
          marginBottom: 15,
          marginLeft: 0,
          marginRight: 0,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 10,
          paddingRight: 10,
          backgroundColor: '#ffffff',
          color: '#000000',
          borderColor: '#000000',
          borderWidth: 0,
          borderStyle: 'none',
          lineHeight: 1.4,
          letterSpacing: 0,
        },
        visible: (initialData.projects?.length || 0) > 0,
      },
      {
        id: 'certifications',
        type: 'certifications',
        title: 'Certifications',
        content: initialData.certifications || [],
        styles: {
          fontSize: 11,
          fontWeight: 'normal',
          textAlign: 'left',
          marginTop: 15,
          marginBottom: 15,
          marginLeft: 0,
          marginRight: 0,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 10,
          paddingRight: 10,
          backgroundColor: '#ffffff',
          color: '#000000',
          borderColor: '#000000',
          borderWidth: 0,
          borderStyle: 'none',
          lineHeight: 1.4,
          letterSpacing: 0,
        },
        visible: (initialData.certifications?.length || 0) > 0,
      },
      {
        id: 'education',
        type: 'education',
        title: 'Education',
        content: initialData.education || [],
        styles: {
          fontSize: 11,
          fontWeight: 'normal',
          textAlign: 'left',
          marginTop: 15,
          marginBottom: 15,
          marginLeft: 0,
          marginRight: 0,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 10,
          paddingRight: 10,
          backgroundColor: '#ffffff',
          color: '#000000',
          borderColor: '#000000',
          borderWidth: 0,
          borderStyle: 'none',
          lineHeight: 1.4,
          letterSpacing: 0,
        },
        visible: (initialData.education?.length || 0) > 0,
      },
    ]);
  }, [initialData]);

  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === targetSectionId) return;

    const newSections = [...sections];
    const draggedIndex = newSections.findIndex(s => s.id === draggedSection);
    const targetIndex = newSections.findIndex(s => s.id === targetSectionId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [removed] = newSections.splice(draggedIndex, 1);
    if (removed) {
      newSections.splice(targetIndex, 0, removed);
      setSections(newSections);
    }
    setDraggedSection(null);
  };

  const updateSectionContent = (sectionId: string, content: any) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, content } : section
    ));
  };

  const updateSectionStyles = (sectionId: string, styles: Partial<SectionStyles>) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, styles: { ...section.styles, ...styles } } : section
    ));
  };

  const toggleSectionVisibility = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, visible: !section.visible } : section
    ));
  };

  const addDivider = () => {
    const newDivider: ResumeSection = {
      id: `divider-${Date.now()}`,
      type: 'divider',
      title: 'Divider',
      content: null,
      styles: {
        fontSize: 12,
        fontWeight: 'normal',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 10,
        marginLeft: 0,
        marginRight: 0,
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: 0,
        paddingRight: 0,
        backgroundColor: '#ffffff',
        color: '#000000',
        borderColor: '#000000',
        borderWidth: 1,
        borderStyle: 'solid',
        lineHeight: 1,
        letterSpacing: 0,
      },
      visible: true,
    };
    setSections([...sections, newDivider]);
  };

  const addSpacer = () => {
    const newSpacer: ResumeSection = {
      id: `spacer-${Date.now()}`,
      type: 'spacer',
      title: 'Spacer',
      content: null,
      styles: {
        fontSize: 12,
        fontWeight: 'normal',
        textAlign: 'left',
        marginTop: 20,
        marginBottom: 20,
        marginLeft: 0,
        marginRight: 0,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        backgroundColor: '#ffffff',
        color: '#000000',
        borderColor: '#000000',
        borderWidth: 0,
        borderStyle: 'none',
        lineHeight: 1,
        letterSpacing: 0,
      },
      visible: true,
    };
    setSections([...sections, newSpacer]);
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const addExperienceItem = () => {
    const experienceSection = sections.find(s => s.type === 'experience');
    if (experienceSection) {
      const newExperience = [...(experienceSection.content as any[]), {
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '',
      }];
      updateSectionContent(experienceSection.id, newExperience);
    }
  };

  const removeExperienceItem = (index: number) => {
    const experienceSection = sections.find(s => s.type === 'experience');
    if (experienceSection) {
      const newExperience = (experienceSection.content as any[]).filter((_, i) => i !== index);
      updateSectionContent(experienceSection.id, newExperience);
    }
  };

  const updateExperienceItem = (index: number, field: string, value: string) => {
    const experienceSection = sections.find(s => s.type === 'experience');
    if (experienceSection) {
      const newExperience = (experienceSection.content as any[]).map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
      updateSectionContent(experienceSection.id, newExperience);
    }
  };

  const handleExport = () => {
    const resumeData: ResumeData = {
      name: (sections.find(s => s.type === 'header')?.content as any)?.name || '',
      email: (sections.find(s => s.type === 'header')?.content as any)?.email || '',
      phone: (sections.find(s => s.type === 'header')?.content as any)?.phone || '',
      location: (sections.find(s => s.type === 'header')?.content as any)?.location || '',
      linkedin: (sections.find(s => s.type === 'header')?.content as any)?.linkedin || '',
      github: (sections.find(s => s.type === 'header')?.content as any)?.github || '',
      summary: sections.find(s => s.type === 'summary')?.content as string || '',
      experience: sections.find(s => s.type === 'experience')?.content as any[] || [],
      education: sections.find(s => s.type === 'education')?.content as any[] || [],
      skills: sections.find(s => s.type === 'skills')?.content as string[] || [],
      projects: sections.find(s => s.type === 'projects')?.content as any[] || [],
      certifications: sections.find(s => s.type === 'certifications')?.content as any[] || [],
    };
    onExport(resumeData);
    onClose();
  };

  const handleExportPDF = async () => {
    if (!resumeId) return;
    
    const resumeData: ResumeData = {
      name: (sections.find(s => s.type === 'header')?.content as any)?.name || '',
      email: (sections.find(s => s.type === 'header')?.content as any)?.email || '',
      phone: (sections.find(s => s.type === 'header')?.content as any)?.phone || '',
      location: (sections.find(s => s.type === 'header')?.content as any)?.location || '',
      linkedin: (sections.find(s => s.type === 'header')?.content as any)?.linkedin || '',
      github: (sections.find(s => s.type === 'header')?.content as any)?.github || '',
      summary: sections.find(s => s.type === 'summary')?.content as string || '',
      experience: sections.find(s => s.type === 'experience')?.content as any[] || [],
      education: sections.find(s => s.type === 'education')?.content as any[] || [],
      skills: sections.find(s => s.type === 'skills')?.content as string[] || [],
      projects: sections.find(s => s.type === 'projects')?.content as any[] || [],
      certifications: sections.find(s => s.type === 'certifications')?.content as any[] || [],
    };

    try {
      const res = await fetch(`/api/resume/${resumeId}/export/openresume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData }),
      });

      if (!res.ok) throw new Error("PDF export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Resume_VisualBuilder_${resumeId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Visual Resume Builder</DialogTitle>
          <DialogDescription>
            Drag and drop sections to reorder, edit content and styles, then export your resume.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Resume Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Preview</h3>
            <div className="border rounded-lg p-6 bg-white min-h-[500px]">
              {sections.filter(s => s.visible).map((section) => (
                <div
                  key={section.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, section.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, section.id)}
                  style={{
                    fontSize: `${section.styles.fontSize}px`,
                    fontWeight: section.styles.fontWeight,
                    textAlign: section.styles.textAlign,
                    marginTop: `${section.styles.marginTop}px`,
                    marginBottom: `${section.styles.marginBottom}px`,
                    marginLeft: `${section.styles.marginLeft}px`,
                    marginRight: `${section.styles.marginRight}px`,
                    paddingTop: `${section.styles.paddingTop}px`,
                    paddingBottom: `${section.styles.paddingBottom}px`,
                    paddingLeft: `${section.styles.paddingLeft}px`,
                    paddingRight: `${section.styles.paddingRight}px`,
                    backgroundColor: section.styles.backgroundColor,
                    color: section.styles.color,
                    border: section.styles.borderStyle !== 'none' 
                      ? `${section.styles.borderWidth}px ${section.styles.borderStyle} ${section.styles.borderColor}`
                      : 'none',
                    lineHeight: section.styles.lineHeight,
                    letterSpacing: `${section.styles.letterSpacing}px`,
                  }}
                  className="cursor-move hover:bg-gray-50 rounded mb-2"
                >
                  {section.type === 'header' && (
                    <div>
                      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {(section.content as any).name}
                      </h1>
                      <p style={{ fontSize: '12px', color: '#666' }}>
                        {[
                          (section.content as any).email,
                          (section.content as any).phone,
                          (section.content as any).location,
                          (section.content as any).linkedin,
                          (section.content as any).github,
                        ].filter(Boolean).join(' | ')}
                      </p>
                    </div>
                  )}
                  {section.type === 'summary' && (
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
                        {section.title}
                      </h2>
                      <p>{section.content as string}</p>
                    </div>
                  )}
                  {section.type === 'experience' && (
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
                        {section.title}
                      </h2>
                      {(section.content as any[]).map((exp, index) => (
                        <div key={index} style={{ marginBottom: '12px' }}>
                          <div style={{ fontWeight: 'bold' }}>{exp.title}</div>
                          <div style={{ fontWeight: '600' }}>{exp.company}</div>
                          <div style={{ fontSize: '10px', color: '#666' }}>
                            {exp.location && `${exp.location} | `}
                            {[exp.startDate, exp.endDate].filter(Boolean).join(' – ')}
                          </div>
                          <div style={{ fontSize: '10px', lineHeight: '1.5' }}>{exp.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {section.type === 'skills' && (
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
                        {section.title}
                      </h2>
                      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                        {(section.content as string[]).map((skill, index) => (
                          <span key={index} style={{ marginRight: '12px', marginBottom: '6px' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {section.type === 'education' && (
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
                        {section.title}
                      </h2>
                      {(section.content as any[]).map((edu, index) => (
                        <div key={index} style={{ marginBottom: '12px' }}>
                          <div style={{ fontWeight: 'bold' }}>{edu.degree}</div>
                          <div style={{ fontWeight: '600' }}>{edu.school}</div>
                          <div style={{ fontSize: '10px', color: '#666' }}>
                            {edu.location && `${edu.location} | `}
                            {[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {section.type === 'projects' && (
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
                        {section.title}
                      </h2>
                      {(section.content as any[]).map((proj, index) => (
                        <div key={index} style={{ marginBottom: '12px' }}>
                          <div style={{ fontWeight: 'bold' }}>{proj.title}</div>
                          <div style={{ fontSize: '10px', lineHeight: '1.5' }}>{proj.description}</div>
                          <div style={{ fontSize: '10px', color: '#666' }}>
                            {(proj.technologies || []).join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {section.type === 'certifications' && (
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
                        {section.title}
                      </h2>
                      {(section.content as any[]).map((cert, index) => (
                        <div key={index} style={{ marginBottom: '8px' }}>
                          <div style={{ fontWeight: 'bold' }}>{cert.name}</div>
                          <div style={{ fontSize: '10px', color: '#666' }}>
                            {cert.issuer} | {cert.date}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {section.type === 'divider' && (
                    <div style={{ 
                      borderTop: `${section.styles.borderWidth}px ${section.styles.borderStyle} ${section.styles.borderColor}`,
                      margin: `${section.styles.marginTop}px 0 ${section.styles.marginBottom}px 0`,
                    }} />
                  )}
                  {section.type === 'spacer' && (
                    <div style={{ height: `${section.styles.marginTop + section.styles.marginBottom}px` }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Editor Panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Editor</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addDivider}>
                  <Minus className="mr-2 h-4 w-4" /> Add Divider
                </Button>
                <Button variant="outline" size="sm" onClick={addSpacer}>
                  <Layout className="mr-2 h-4 w-4" /> Add Spacer
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {sections.map((section) => (
                <Card key={section.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <GripVertical className="h-4 w-4 cursor-move" />
                        {section.title}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
                        >
                          {editingSection === section.id ? 'Close' : 'Edit'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSectionVisibility(section.id)}
                        >
                          {section.visible ? 'Hide' : 'Show'}
                        </Button>
                        {(section.type === 'divider' || section.type === 'spacer') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSection(section.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {editingSection === section.id && (
                    <CardContent className="space-y-3">
                      {/* Content Editing */}
                      {section.type === 'header' && (
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={(section.content as any).name || ''}
                            onChange={(e) => updateSectionContent(section.id, { ...section.content, name: e.target.value })}
                          />
                          <Label>Email</Label>
                          <Input
                            value={(section.content as any).email || ''}
                            onChange={(e) => updateSectionContent(section.id, { ...section.content, email: e.target.value })}
                          />
                          <Label>Phone</Label>
                          <Input
                            value={(section.content as any).phone || ''}
                            onChange={(e) => updateSectionContent(section.id, { ...section.content, phone: e.target.value })}
                          />
                          <Label>Location</Label>
                          <Input
                            value={(section.content as any).location || ''}
                            onChange={(e) => updateSectionContent(section.id, { ...section.content, location: e.target.value })}
                          />
                        </div>
                      )}
                      {section.type === 'summary' && (
                        <div className="space-y-2">
                          <Label>Summary</Label>
                          <Textarea
                            value={section.content as string}
                            onChange={(e) => updateSectionContent(section.id, e.target.value)}
                            rows={4}
                          />
                        </div>
                      )}
                      {section.type === 'experience' && (
                        <div className="space-y-3">
                          {(section.content as any[]).map((exp, index) => (
                            <div key={index} className="border rounded p-3 space-y-2">
                              <div className="flex justify-between">
                                <Label>Experience {index + 1}</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeExperienceItem(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <Input
                                placeholder="Title"
                                value={exp.title || ''}
                                onChange={(e) => updateExperienceItem(index, 'title', e.target.value)}
                              />
                              <Input
                                placeholder="Company"
                                value={exp.company || ''}
                                onChange={(e) => updateExperienceItem(index, 'company', e.target.value)}
                              />
                              <Input
                                placeholder="Location"
                                value={exp.location || ''}
                                onChange={(e) => updateExperienceItem(index, 'location', e.target.value)}
                              />
                              <Textarea
                                placeholder="Description"
                                value={exp.description || ''}
                                onChange={(e) => updateExperienceItem(index, 'description', e.target.value)}
                                rows={2}
                              />
                            </div>
                          ))}
                          <Button variant="outline" onClick={addExperienceItem} className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> Add Experience
                          </Button>
                        </div>
                      )}
                      {section.type === 'education' && (
                        <div className="space-y-3">
                          {(section.content as any[]).map((edu, index) => (
                            <div key={index} className="border rounded p-3 space-y-2">
                              <div className="flex justify-between">
                                <Label>Education {index + 1}</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newEducation = (section.content as any[]).filter((_, i) => i !== index);
                                    updateSectionContent(section.id, newEducation);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <Input
                                placeholder="Degree"
                                value={edu.degree || ''}
                                onChange={(e) => {
                                  const newEducation = (section.content as any[]).map((item, i) =>
                                    i === index ? { ...item, degree: e.target.value } : item
                                  );
                                  updateSectionContent(section.id, newEducation);
                                }}
                              />
                              <Input
                                placeholder="School"
                                value={edu.school || ''}
                                onChange={(e) => {
                                  const newEducation = (section.content as any[]).map((item, i) =>
                                    i === index ? { ...item, school: e.target.value } : item
                                  );
                                  updateSectionContent(section.id, newEducation);
                                }}
                              />
                              <Input
                                placeholder="Location"
                                value={edu.location || ''}
                                onChange={(e) => {
                                  const newEducation = (section.content as any[]).map((item, i) =>
                                    i === index ? { ...item, location: e.target.value } : item
                                  );
                                  updateSectionContent(section.id, newEducation);
                                }}
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  placeholder="Start Date"
                                  value={edu.startDate || ''}
                                  onChange={(e) => {
                                    const newEducation = (section.content as any[]).map((item, i) =>
                                      i === index ? { ...item, startDate: e.target.value } : item
                                    );
                                    updateSectionContent(section.id, newEducation);
                                  }}
                                />
                                <Input
                                  placeholder="End Date"
                                  value={edu.endDate || ''}
                                  onChange={(e) => {
                                    const newEducation = (section.content as any[]).map((item, i) =>
                                      i === index ? { ...item, endDate: e.target.value } : item
                                    );
                                    updateSectionContent(section.id, newEducation);
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              const newEducation = [...(section.content as any[]), { degree: '', school: '', location: '', startDate: '', endDate: '' }];
                              updateSectionContent(section.id, newEducation);
                            }} 
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Add Education
                          </Button>
                        </div>
                      )}
                      {section.type === 'projects' && (
                        <div className="space-y-3">
                          {(section.content as any[]).map((proj, index) => (
                            <div key={index} className="border rounded p-3 space-y-2">
                              <div className="flex justify-between">
                                <Label>Project {index + 1}</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newProjects = (section.content as any[]).filter((_, i) => i !== index);
                                    updateSectionContent(section.id, newProjects);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <Input
                                placeholder="Project Title"
                                value={proj.title || ''}
                                onChange={(e) => {
                                  const newProjects = (section.content as any[]).map((item, i) =>
                                    i === index ? { ...item, title: e.target.value } : item
                                  );
                                  updateSectionContent(section.id, newProjects);
                                }}
                              />
                              <Textarea
                                placeholder="Project Description"
                                value={proj.description || ''}
                                onChange={(e) => {
                                  const newProjects = (section.content as any[]).map((item, i) =>
                                    i === index ? { ...item, description: e.target.value } : item
                                  );
                                  updateSectionContent(section.id, newProjects);
                                }}
                                rows={2}
                              />
                              <Input
                                placeholder="Technologies (comma-separated)"
                                value={(proj.technologies || []).join(', ')}
                                onChange={(e) => {
                                  const newProjects = (section.content as any[]).map((item, i) =>
                                    i === index ? { ...item, technologies: e.target.value.split(',').map(t => t.trim()).filter(t => t) } : item
                                  );
                                  updateSectionContent(section.id, newProjects);
                                }}
                              />
                            </div>
                          ))}
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              const newProjects = [...(section.content as any[]), { title: '', description: '', technologies: [] }];
                              updateSectionContent(section.id, newProjects);
                            }} 
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Add Project
                          </Button>
                        </div>
                      )}
                      {section.type === 'certifications' && (
                        <div className="space-y-3">
                          {(section.content as any[]).map((cert, index) => (
                            <div key={index} className="border rounded p-3 space-y-2">
                              <div className="flex justify-between">
                                <Label>Certification {index + 1}</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newCertifications = (section.content as any[]).filter((_, i) => i !== index);
                                    updateSectionContent(section.id, newCertifications);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <Input
                                placeholder="Certification Name"
                                value={cert.name || ''}
                                onChange={(e) => {
                                  const newCertifications = (section.content as any[]).map((item, i) =>
                                    i === index ? { ...item, name: e.target.value } : item
                                  );
                                  updateSectionContent(section.id, newCertifications);
                                }}
                              />
                              <Input
                                placeholder="Issuer"
                                value={cert.issuer || ''}
                                onChange={(e) => {
                                  const newCertifications = (section.content as any[]).map((item, i) =>
                                    i === index ? { ...item, issuer: e.target.value } : item
                                  );
                                  updateSectionContent(section.id, newCertifications);
                                }}
                              />
                              <Input
                                placeholder="Date"
                                value={cert.date || ''}
                                onChange={(e) => {
                                  const newCertifications = (section.content as any[]).map((item, i) =>
                                    i === index ? { ...item, date: e.target.value } : item
                                  );
                                  updateSectionContent(section.id, newCertifications);
                                }}
                              />
                            </div>
                          ))}
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              const newCertifications = [...(section.content as any[]), { name: '', issuer: '', date: '' }];
                              updateSectionContent(section.id, newCertifications);
                            }} 
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Add Certification
                          </Button>
                        </div>
                      )}
                      {section.type === 'skills' && (
                        <div className="space-y-2">
                          <Label>Skills (comma-separated)</Label>
                          <Textarea
                            value={(section.content as string[]).join(', ')}
                            onChange={(e) => updateSectionContent(section.id, e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                            rows={3}
                          />
                        </div>
                      )}

                      {/* Style Editing */}
                      <div className="border-t pt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Font Size: {section.styles.fontSize}px</Label>
                            <Input
                              type="range"
                              min="8"
                              max="32"
                              value={section.styles.fontSize}
                              onChange={(e) => updateSectionStyles(section.id, { fontSize: parseInt(e.target.value) })}
                              className="h-2"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Line Height: {section.styles.lineHeight}</Label>
                            <Input
                              type="range"
                              min="1"
                              max="3"
                              step="0.1"
                              value={section.styles.lineHeight}
                              onChange={(e) => updateSectionStyles(section.id, { lineHeight: parseFloat(e.target.value) })}
                              className="h-2"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Margin Top: {section.styles.marginTop}px</Label>
                            <Input
                              type="range"
                              min="0"
                              max="50"
                              value={section.styles.marginTop}
                              onChange={(e) => updateSectionStyles(section.id, { marginTop: parseInt(e.target.value) })}
                              className="h-2"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Margin Bottom: {section.styles.marginBottom}px</Label>
                            <Input
                              type="range"
                              min="0"
                              max="50"
                              value={section.styles.marginBottom}
                              onChange={(e) => updateSectionStyles(section.id, { marginBottom: parseInt(e.target.value) })}
                              className="h-2"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Padding Top: {section.styles.paddingTop}px</Label>
                            <Input
                              type="range"
                              min="0"
                              max="30"
                              value={section.styles.paddingTop}
                              onChange={(e) => updateSectionStyles(section.id, { paddingTop: parseInt(e.target.value) })}
                              className="h-2"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Padding Bottom: {section.styles.paddingBottom}px</Label>
                            <Input
                              type="range"
                              min="0"
                              max="30"
                              value={section.styles.paddingBottom}
                              onChange={(e) => updateSectionStyles(section.id, { paddingBottom: parseInt(e.target.value) })}
                              className="h-2"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Background Color</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              value={section.styles.backgroundColor}
                              onChange={(e) => updateSectionStyles(section.id, { backgroundColor: e.target.value })}
                              className="w-12 h-8 p-0 border-0"
                            />
                            <Input
                              type="text"
                              value={section.styles.backgroundColor}
                              onChange={(e) => updateSectionStyles(section.id, { backgroundColor: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Text Color</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              value={section.styles.color}
                              onChange={(e) => updateSectionStyles(section.id, { color: e.target.value })}
                              className="w-12 h-8 p-0 border-0"
                            />
                            <Input
                              type="text"
                              value={section.styles.color}
                              onChange={(e) => updateSectionStyles(section.id, { color: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Border Style</Label>
                          <div className="flex gap-2">
                            {(['none', 'solid', 'dashed', 'dotted'] as const).map((style) => (
                              <Button
                                key={style}
                                variant={section.styles.borderStyle === style ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateSectionStyles(section.id, { borderStyle: style })}
                                className="flex-1"
                              >
                                {style}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {section.styles.borderStyle !== 'none' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Border Width: {section.styles.borderWidth}px</Label>
                              <Input
                                type="range"
                                min="1"
                                max="5"
                                value={section.styles.borderWidth}
                                onChange={(e) => updateSectionStyles(section.id, { borderWidth: parseInt(e.target.value) })}
                                className="h-2"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Border Color</Label>
                              <div className="flex gap-2 items-center">
                                <Input
                                  type="color"
                                  value={section.styles.borderColor}
                                  onChange={(e) => updateSectionStyles(section.id, { borderColor: e.target.value })}
                                  className="w-12 h-8 p-0 border-0"
                                />
                                <Input
                                  type="text"
                                  value={section.styles.borderColor}
                                  onChange={(e) => updateSectionStyles(section.id, { borderColor: e.target.value })}
                                  className="flex-1"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <Label className="text-xs">Text Alignment</Label>
                          <div className="flex gap-2">
                            <Button
                              variant={section.styles.textAlign === 'left' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateSectionStyles(section.id, { textAlign: 'left' })}
                            >
                              <AlignLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={section.styles.textAlign === 'center' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateSectionStyles(section.id, { textAlign: 'center' })}
                            >
                              <AlignCenter className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={section.styles.textAlign === 'right' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateSectionStyles(section.id, { textAlign: 'right' })}
                            >
                              <AlignRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Font Weight</Label>
                          <div className="flex gap-2">
                            <Button
                              variant={section.styles.fontWeight === 'normal' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateSectionStyles(section.id, { fontWeight: 'normal' })}
                            >
                              Normal
                            </Button>
                            <Button
                              variant={section.styles.fontWeight === 'bold' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateSectionStyles(section.id, { fontWeight: 'bold' })}
                            >
                              <Bold className="h-4 w-4 mr-1" /> Bold
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            Save Changes
          </Button>
          {resumeId && (
            <Button onClick={handleExportPDF} className="bg-primary text-primary-foreground">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
