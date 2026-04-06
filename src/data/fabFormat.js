export const formatSkillsToString = (skillsArray) =>
  skillsArray.join(", ");

export const formatPointsFromArray = (bullets) =>
  bullets.join("\n");

export const formatPointsFromString = (str) =>
  str.trim();

export const mergeExperience = (prev, index, newData) => ({
  ...prev,
  experience: prev.experience.map((exp, i) =>
    i === index ? { ...exp, ...newData } : exp
  ),
});

export const appendExperience = (prev, newExp) => ({
  ...prev,
  experience: [...prev.experience, newExp],
});

export const writeField = (prev, field, value) => ({
  ...prev,
  [field]: value,
});

export const safeWriteExperience = (prev, index, newData) => {
  const experience = [...(prev.experience || [])];
  while (experience.length <= index) {
    experience.push({
      company: "",
      role: "",
      location: "",
      period: "",
      points: "",
      startDate: "",
      endDate: "",
      present: false,
    });
  }
  experience[index] = { ...experience[index], ...newData };
  return { ...prev, experience };
};
