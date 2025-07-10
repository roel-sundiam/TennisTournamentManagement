import express, { Request, Response } from 'express';

const router = express.Router();

// Auto-generate courts based on common tournament needs
function generateCourts(count: number = 5) {
  const courts = [];
  for (let i = 1; i <= count; i++) {
    courts.push({
      _id: i.toString(),
      name: `Court ${i}`,
      type: 'outdoor',
      status: 'available',
      location: 'Tournament Area',
      isActive: true,
      capacity: 4,
      notes: `Tournament court ${i}`
    });
  }
  return courts;
}

// Generate default courts (can be expanded as needed)
const tempCourts = generateCourts(10);

// @desc    Get all courts
// @route   GET /api/courts
// @access  Public
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    count: tempCourts.length,
    data: tempCourts
  });
});

// @desc    Get available courts
// @route   GET /api/courts/available
// @access  Public
router.get('/available', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  let availableCourts = tempCourts.filter(court => 
    court.status === 'available' && court.isActive
  );

  // If limit is specified, return only that many courts
  if (limit && limit > 0) {
    availableCourts = availableCourts.slice(0, limit);
  }

  res.status(200).json({
    success: true,
    count: availableCourts.length,
    data: availableCourts
  });
});

// @desc    Create court
// @route   POST /api/courts
// @access  Public
router.post('/', (req: Request, res: Response) => {
  const newCourt = {
    _id: (tempCourts.length + 1).toString(),
    ...req.body,
    isActive: true
  };
  tempCourts.push(newCourt);
  
  res.status(201).json({
    success: true,
    data: newCourt
  });
});

// @desc    Get court by ID
// @route   GET /api/courts/:id
// @access  Public
router.get('/:id', (req: Request, res: Response) => {
  const court = tempCourts.find(c => c._id === req.params.id);
  
  if (!court) {
    res.status(404).json({
      success: false,
      error: 'Court not found'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: court
  });
});

export default router;