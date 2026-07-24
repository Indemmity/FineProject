"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, X } from "lucide-react";
import type { ResumeData, ExperienceItem, EducationItem, ProjectItem, CertificationItem } from "@jobplatform/shared/lib/resume/extractor";

interface ResumeDataEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ResumeData) => void;
  initialData: ResumeData;
}

export function ResumeDataEditor({ isOpen, onClose, onSave, initialData }: ResumeDataEditorProps) {
  const [data, setData] = useState<ResumeData>(initialData);

  const updateField = (field: keyof ResumeData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateExperience = (index: number, field: keyof ExperienceItem, value: string) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const addExperience = () => {
    setData(prev => ({
      ...prev,
      experience: [...prev.experience, { title: '', company: '', location: '', startDate: '', endDate: '', description: '' }]
    }));
  };

  const removeExperience = (index: number) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const updateEducation = (index: number, field: keyof EducationItem, value: string) => {
    setData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const addEducation = () => {
    setData(prev => ({
      ...prev,
      education: [...prev.education, { degree: '', school: '', location: '', startDate: '', endDate: '' }]
    }));
  };

  const removeEducation = (index: number) => {
    setData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const updateProject = (index: number, field: keyof ProjectItem, value: string | string[]) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map((proj, i) => 
        i === index ? { ...proj, [field]: value } : proj
      )
    }));
  };

  const addProject = () => {
    setData(prev => ({
      ...prev,
      projects: [...prev.projects, { title: '', description: '', technologies: [] }]
    }));
  };

  const removeProject = (index: number) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  const updateCertification = (index: number, field: keyof CertificationItem, value: string) => {
    setData(prev => ({
      ...prev,
      certifications: prev.certifications.map((cert, i) => 
        i === index ? { ...cert, [field]: value } : cert
      )
    }));
  };

  const addCertification = () => {
    setData(prev => ({
      ...prev,
      certifications: [...prev.certifications, { name: '', issuer: '', date: '' }]
    }));
  };

  const removeCertification = (index: number) => {
    setData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const updateSkills = (value: string) => {
    const skillsArray = value.split(',').map(s => s.trim()).filter(s => s);
    setData(prev => ({ ...prev, skills: skillsArray }));
  };

  const handleSave = () => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Resume Information</DialogTitle>
          <DialogDescription>
            Review and edit the extracted information from your resume. This data will be used to generate your professional resume template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={data.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={data.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={data.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={data.location || ''}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="San Francisco, CA"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={data.linkedin || ''}
                    onChange={(e) => updateField('linkedin', e.target.value)}
                    placeholder="linkedin.com/in/johndoe"
                  />
                </div>
                <div>
                  <Label htmlFor="github">GitHub</Label>
                  <Input
                    id="github"
                    value={data.github || ''}
                    onChange={(e) => updateField('github', e.target.value)}
                    placeholder="github.com/johndoe"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Professional Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={data.summary || ''}
                onChange={(e) => updateField('summary', e.target.value)}
                placeholder="Brief professional summary..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Work Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.experience.map((exp, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      <div>
                        <Label htmlFor={`exp-title-${index}`}>Job Title</Label>
                        <Input
                          id={`exp-title-${index}`}
                          value={exp.title || ''}
                          onChange={(e) => updateExperience(index, 'title', e.target.value)}
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`exp-company-${index}`}>Company</Label>
                        <Input
                          id={`exp-company-${index}`}
                          value={exp.company || ''}
                          onChange={(e) => updateExperience(index, 'company', e.target.value)}
                          placeholder="Tech Company"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`exp-location-${index}`}>Location</Label>
                        <Input
                          id={`exp-location-${index}`}
                          value={exp.location || ''}
                          onChange={(e) => updateExperience(index, 'location', e.target.value)}
                          placeholder="Remote"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`exp-start-${index}`}>Start Date</Label>
                          <Input
                            id={`exp-start-${index}`}
                            value={exp.startDate || ''}
                            onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                            placeholder="Jan 2020"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`exp-end-${index}`}>End Date</Label>
                          <Input
                            id={`exp-end-${index}`}
                            value={exp.endDate || ''}
                            onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                            placeholder="Present"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExperience(index)}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor={`exp-desc-${index}`}>Description</Label>
                    <Textarea
                      id={`exp-desc-${index}`}
                      value={exp.description || ''}
                      onChange={(e) => updateExperience(index, 'description', e.target.value)}
                      placeholder="Job responsibilities and achievements..."
                      rows={3}
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addExperience} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Experience
              </Button>
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.education.map((edu, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      <div>
                        <Label htmlFor={`edu-degree-${index}`}>Degree</Label>
                        <Input
                          id={`edu-degree-${index}`}
                          value={edu.degree || ''}
                          onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                          placeholder="Bachelor of Science in Computer Science"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edu-school-${index}`}>School</Label>
                        <Input
                          id={`edu-school-${index}`}
                          value={edu.school || ''}
                          onChange={(e) => updateEducation(index, 'school', e.target.value)}
                          placeholder="University Name"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edu-location-${index}`}>Location</Label>
                        <Input
                          id={`edu-location-${index}`}
                          value={edu.location || ''}
                          onChange={(e) => updateEducation(index, 'location', e.target.value)}
                          placeholder="City, State"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`edu-start-${index}`}>Start Date</Label>
                          <Input
                            id={`edu-start-${index}`}
                            value={edu.startDate || ''}
                            onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                            placeholder="Sep 2016"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edu-end-${index}`}>End Date</Label>
                          <Input
                            id={`edu-end-${index}`}
                            value={edu.endDate || ''}
                            onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                            placeholder="May 2020"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEducation(index)}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addEducation} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Education
              </Button>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Textarea
                id="skills"
                value={data.skills.join(', ')}
                onChange={(e) => updateSkills(e.target.value)}
                placeholder="JavaScript, TypeScript, React, Node.js, Python"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.projects.map((proj, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-1 gap-3 flex-1">
                      <div>
                        <Label htmlFor={`proj-title-${index}`}>Project Title</Label>
                        <Input
                          id={`proj-title-${index}`}
                          value={proj.title || ''}
                          onChange={(e) => updateProject(index, 'title', e.target.value)}
                          placeholder="Project Name"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`proj-desc-${index}`}>Description</Label>
                        <Textarea
                          id={`proj-desc-${index}`}
                          value={proj.description || ''}
                          onChange={(e) => updateProject(index, 'description', e.target.value)}
                          placeholder="Project description..."
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`proj-tech-${index}`}>Technologies (comma-separated)</Label>
                        <Input
                          id={`proj-tech-${index}`}
                          value={proj.technologies?.join(', ') || ''}
                          onChange={(e) => updateProject(index, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                          placeholder="React, Node.js, MongoDB"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProject(index)}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addProject} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Project
              </Button>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Certifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.certifications.map((cert, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      <div>
                        <Label htmlFor={`cert-name-${index}`}>Certification Name</Label>
                        <Input
                          id={`cert-name-${index}`}
                          value={cert.name || ''}
                          onChange={(e) => updateCertification(index, 'name', e.target.value)}
                          placeholder="AWS Certified Solutions Architect"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`cert-issuer-${index}`}>Issuer</Label>
                        <Input
                          id={`cert-issuer-${index}`}
                          value={cert.issuer || ''}
                          onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                          placeholder="Amazon Web Services"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`cert-date-${index}`}>Date</Label>
                        <Input
                          id={`cert-date-${index}`}
                          value={cert.date || ''}
                          onChange={(e) => updateCertification(index, 'date', e.target.value)}
                          placeholder="Jan 2024"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCertification(index)}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addCertification} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Certification
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
