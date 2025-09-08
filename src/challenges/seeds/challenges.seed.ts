export const challengeSeeds = [
  {
    title: 'Basic Circuit Components',
    description: 'Learn about the fundamental components used in electrical circuits.',
    question: 'What are the four basic passive components in electrical circuits?',
    correctAnswer: 'resistor, capacitor, inductor, diode',
    difficulty: 'easy',
    order: 1,
    hasPhotoExperiment: false
  },
  {
    title: 'Ohm\'s Law Calculation',
    description: 'Apply Ohm\'s law to calculate current in a simple circuit.',
    question: 'Calculate the current (in Amperes) in a circuit with 12V voltage and 4Ω resistance. (Enter only the number)',
    correctAnswer: '3',
    difficulty: 'easy',
    order: 2,
    hasPhotoExperiment: false
  },
  {
    title: 'LED Circuit Experiment',
    description: 'Build a simple LED circuit and understand current limiting.',
    question: 'What component is essential to prevent an LED from burning out in a circuit?',
    correctAnswer: 'resistor',
    difficulty: 'easy',
    order: 3,
    hasPhotoExperiment: true,
    photoPrompt: 'Build a simple LED circuit with a resistor and battery. Take a photo showing the LED lit up with all components clearly visible.'
  },
  {
    title: 'Parallel Resistance',
    description: 'Calculate equivalent resistance in parallel circuits.',
    question: 'What is the total resistance (in Ohms) of three 6Ω resistors connected in parallel? (Enter only the number)',
    correctAnswer: '2',
    difficulty: 'medium',
    order: 4,
    hasPhotoExperiment: false
  },
  {
    title: 'Capacitor Behavior',
    description: 'Understand how capacitors behave in RC circuits.',
    question: 'In an RC charging circuit, how does the voltage across the capacitor change over time?',
    correctAnswer: 'increases exponentially',
    difficulty: 'medium',
    order: 5,
    hasPhotoExperiment: false
  },
  {
    title: 'Voltage Divider Analysis',
    description: 'Design and analyze voltage divider circuits.',
    question: 'In a voltage divider with R1=1kΩ and R2=2kΩ connected to 9V, what is the output voltage (in Volts) across R2? (Enter only the number)',
    correctAnswer: '6',
    difficulty: 'medium',
    order: 6,
    hasPhotoExperiment: true,
    photoPrompt: 'Build the voltage divider circuit described in the question and measure the output voltage with a multimeter. Show your circuit and measurement.'
  },
  {
    title: 'Transistor Function',
    description: 'Understand the role of transistors in amplification.',
    question: 'What is the primary function of a BJT transistor in amplifier circuits?',
    correctAnswer: 'amplify signals',
    difficulty: 'hard',
    order: 7,
    hasPhotoExperiment: false
  },
  {
    title: 'Op-Amp Gain Calculation',
    description: 'Calculate gain in operational amplifier configurations.',
    question: 'In an inverting op-amp with Rf=10kΩ and Rin=1kΩ, what is the voltage gain? (Enter the number with sign)',
    correctAnswer: '-10',
    difficulty: 'hard',
    order: 8,
    hasPhotoExperiment: false
  },
  {
    title: 'Op-Amp Circuit Build',
    description: 'Build and test an operational amplifier circuit.',
    question: 'What type of op-amp configuration inverts the input signal?',
    correctAnswer: 'inverting amplifier',
    difficulty: 'hard',
    order: 9,
    hasPhotoExperiment: true,
    photoPrompt: 'Build an inverting op-amp circuit and demonstrate its operation. Show input and output waveforms or voltage measurements.'
  },
  {
    title: 'Filter Design Theory',
    description: 'Design filters for signal processing applications.',
    question: 'What type of filter removes high-frequency noise from a signal?',
    correctAnswer: 'low-pass filter',
    difficulty: 'expert',
    order: 10,
    hasPhotoExperiment: false
  },
  {
    title: 'Microcontroller Programming',
    description: 'Program microcontrollers for digital control applications.',
    question: 'What programming concept is used to repeatedly check the state of a button in microcontroller code?',
    correctAnswer: 'polling',
    difficulty: 'expert',
    order: 11,
    hasPhotoExperiment: true,
    photoPrompt: 'Build a microcontroller circuit that controls an LED with a button press. Show your working circuit with code uploaded.'
  },
  {
    title: 'Power Electronics',
    description: 'Understand switching power supply principles.',
    question: 'In a buck converter, what happens to the output voltage when the duty cycle increases?',
    correctAnswer: 'increases',
    difficulty: 'expert',
    order: 12,
    hasPhotoExperiment: false
  }
];