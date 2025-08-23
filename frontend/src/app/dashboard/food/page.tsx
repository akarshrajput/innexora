'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UtensilsCrossed,
  Clock,
  DollarSign,
  Tag,
  AlertTriangle,
  Leaf
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface FoodItem {
  _id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  isAvailable: boolean;
  preparationTime: number;
  ingredients: string[];
  allergens: string[];
  dietaryInfo: string[];
  spiceLevel: 'mild' | 'medium' | 'hot' | 'very_hot';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface FoodForm {
  name: string;
  category: string;
  price: number;
  description: string;
  isAvailable: boolean;
  preparationTime: number;
  ingredients: string;
  allergens: string;
  dietaryInfo: string[];
  spiceLevel: 'mild' | 'medium' | 'hot' | 'very_hot';
  imageUrl: string;
}

const categories = [
  'Appetizers',
  'Main Course',
  'Desserts',
  'Beverages',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snacks',
  'Salads',
  'Soups'
];

const dietaryOptions = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Keto',
  'Low-Carb',
  'High-Protein',
  'Organic'
];

const spiceLevels = [
  { value: 'mild', label: 'Mild', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hot', label: 'Hot', color: 'bg-orange-100 text-orange-800' },
  { value: 'very_hot', label: 'Very Hot', color: 'bg-red-100 text-red-800' }
];

export default function FoodPage() {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [foodForm, setFoodForm] = useState<FoodForm>({
    name: '',
    category: '',
    price: 0,
    description: '',
    isAvailable: true,
    preparationTime: 15,
    ingredients: '',
    allergens: '',
    dietaryInfo: [],
    spiceLevel: 'mild',
    imageUrl: ''
  });

  useEffect(() => {
    fetchFoodItems();
    fetchCategories();
  }, []);

  const fetchFoodItems = async () => {
    try {
      const response = await apiClient.get('/food');
      setFoodItems(response.data.data);
    } catch (error) {
      console.error('Error fetching food items:', error);
      toast.error('Failed to fetch food items');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/food/categories');
      setAvailableCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddFood = async () => {
    try {
      setIsLoading(true);
      const formData = {
        ...foodForm,
        ingredients: foodForm.ingredients.split(',').map(i => i.trim()).filter(i => i),
        allergens: foodForm.allergens.split(',').map(a => a.trim()).filter(a => a)
      };
      await apiClient.post('/food', formData);
      toast.success('Food item added successfully!');
      setIsAddDialogOpen(false);
      resetForm();
      fetchFoodItems();
      fetchCategories();
    } catch (error: any) {
      console.error('Error adding food item:', error);
      toast.error(error.response?.data?.message || 'Failed to add food item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFood = async () => {
    if (!selectedFood) return;
    
    try {
      setIsLoading(true);
      const formData = {
        ...foodForm,
        ingredients: foodForm.ingredients.split(',').map(i => i.trim()).filter(i => i),
        allergens: foodForm.allergens.split(',').map(a => a.trim()).filter(a => a)
      };
      await apiClient.put(`/food/${selectedFood._id}`, formData);
      toast.success('Food item updated successfully!');
      setIsEditDialogOpen(false);
      setSelectedFood(null);
      resetForm();
      fetchFoodItems();
      fetchCategories();
    } catch (error: any) {
      console.error('Error updating food item:', error);
      toast.error(error.response?.data?.message || 'Failed to update food item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFood = async (foodId: string) => {
    if (!confirm('Are you sure you want to delete this food item?')) return;
    
    try {
      setIsLoading(true);
      await apiClient.delete(`/food/${foodId}`);
      toast.success('Food item deleted successfully!');
      fetchFoodItems();
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting food item:', error);
      toast.error(error.response?.data?.message || 'Failed to delete food item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAvailability = async (foodId: string) => {
    try {
      console.log('Toggling availability for food ID:', foodId);
      const response = await apiClient.patch(`/food/${foodId}/availability`);
      console.log('Toggle response:', response.data);
      toast.success('Availability updated successfully!');
      fetchFoodItems();
    } catch (error: any) {
      console.error('Error toggling availability:', error);
      toast.error(error.message || 'Failed to update availability');
    }
  };

  const resetForm = () => {
    setFoodForm({
      name: '',
      category: '',
      price: 0,
      description: '',
      isAvailable: true,
      preparationTime: 15,
      ingredients: '',
      allergens: '',
      dietaryInfo: [],
      spiceLevel: 'mild',
      imageUrl: ''
    });
  };

  const openEditDialog = (food: FoodItem) => {
    setSelectedFood(food);
    setFoodForm({
      name: food.name,
      category: food.category,
      price: food.price,
      description: food.description || '',
      isAvailable: food.isAvailable,
      preparationTime: food.preparationTime,
      ingredients: food.ingredients.join(', '),
      allergens: food.allergens.join(', '),
      dietaryInfo: food.dietaryInfo,
      spiceLevel: food.spiceLevel,
      imageUrl: food.imageUrl || ''
    });
    setIsEditDialogOpen(true);
  };

  const filteredFoodItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesAvailability = availabilityFilter === 'all' || 
                               (availabilityFilter === 'available' && item.isAvailable) ||
                               (availabilityFilter === 'unavailable' && !item.isAvailable);
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const getSpiceLevelBadge = (level: string) => {
    const spiceLevel = spiceLevels.find(s => s.value === level);
    return (
      <Badge variant="outline" className={spiceLevel?.color}>
        {spiceLevel?.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{foodItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {foodItems.filter(item => item.isAvailable).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableCategories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{foodItems.length > 0 ? Math.round(foodItems.reduce((sum, item) => sum + item.price, 0) / foodItems.length) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search food items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {availableCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Food Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Food Item</DialogTitle>
              <DialogDescription>
                Fill in the details to add a new food item to your menu.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    value={foodForm.name}
                    onChange={(e) => setFoodForm({...foodForm, name: e.target.value})}
                    placeholder="Enter item name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={foodForm.category} onValueChange={(value) => setFoodForm({...foodForm, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={foodForm.price}
                    onChange={(e) => setFoodForm({...foodForm, price: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preparationTime">Prep Time (min) *</Label>
                  <Input
                    id="preparationTime"
                    type="number"
                    min="1"
                    value={foodForm.preparationTime}
                    onChange={(e) => setFoodForm({...foodForm, preparationTime: parseInt(e.target.value) || 15})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spiceLevel">Spice Level</Label>
                  <Select value={foodForm.spiceLevel} onValueChange={(value: any) => setFoodForm({...foodForm, spiceLevel: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {spiceLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={foodForm.description}
                  onChange={(e) => setFoodForm({...foodForm, description: e.target.value})}
                  placeholder="Describe the food item..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ingredients">Ingredients (comma-separated)</Label>
                  <Textarea
                    id="ingredients"
                    value={foodForm.ingredients}
                    onChange={(e) => setFoodForm({...foodForm, ingredients: e.target.value})}
                    placeholder="tomato, onion, garlic..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allergens">Allergens (comma-separated)</Label>
                  <Textarea
                    id="allergens"
                    value={foodForm.allergens}
                    onChange={(e) => setFoodForm({...foodForm, allergens: e.target.value})}
                    placeholder="nuts, dairy, gluten..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dietary Information</Label>
                <div className="grid grid-cols-4 gap-2">
                  {dietaryOptions.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={option}
                        checked={foodForm.dietaryInfo.includes(option)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFoodForm({...foodForm, dietaryInfo: [...foodForm.dietaryInfo, option]});
                          } else {
                            setFoodForm({...foodForm, dietaryInfo: foodForm.dietaryInfo.filter(d => d !== option)});
                          }
                        }}
                      />
                      <Label htmlFor={option} className="text-sm">{option}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isAvailable"
                  checked={foodForm.isAvailable}
                  onCheckedChange={(checked) => setFoodForm({...foodForm, isAvailable: checked})}
                />
                <Label htmlFor="isAvailable">Available for ordering</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddFood} disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Food Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8">Loading food items...</div>
        ) : filteredFoodItems.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No food items found matching your criteria.
          </div>
        ) : (
          filteredFoodItems.map((item) => (
            <Card key={item._id} className={`${!item.isAvailable ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{item.category}</Badge>
                      {getSpiceLevelBadge(item.spiceLevel)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={item.isAvailable}
                      onCheckedChange={() => handleToggleAvailability(item._id)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-lg">₹{item.price}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {item.preparationTime} min
                  </div>
                </div>

                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}

                {item.dietaryInfo.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.dietaryInfo.map((info) => (
                      <Badge key={info} variant="outline" className="text-xs">
                        <Leaf className="h-2 w-2 mr-1" />
                        {info}
                      </Badge>
                    ))}
                  </div>
                )}

                {item.allergens.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-orange-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Contains: {item.allergens.join(', ')}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(item)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteFood(item._id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Food Item</DialogTitle>
            <DialogDescription>
              Update the details of the food item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Item Name *</Label>
                <Input
                  id="edit-name"
                  value={foodForm.name}
                  onChange={(e) => setFoodForm({...foodForm, name: e.target.value})}
                  placeholder="Enter item name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select value={foodForm.category} onValueChange={(value) => setFoodForm({...foodForm, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price (₹) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={foodForm.price}
                  onChange={(e) => setFoodForm({...foodForm, price: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-preparationTime">Prep Time (min) *</Label>
                <Input
                  id="edit-preparationTime"
                  type="number"
                  min="1"
                  value={foodForm.preparationTime}
                  onChange={(e) => setFoodForm({...foodForm, preparationTime: parseInt(e.target.value) || 15})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-spiceLevel">Spice Level</Label>
                <Select value={foodForm.spiceLevel} onValueChange={(value: any) => setFoodForm({...foodForm, spiceLevel: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {spiceLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={foodForm.description}
                onChange={(e) => setFoodForm({...foodForm, description: e.target.value})}
                placeholder="Describe the food item..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-ingredients">Ingredients (comma-separated)</Label>
                <Textarea
                  id="edit-ingredients"
                  value={foodForm.ingredients}
                  onChange={(e) => setFoodForm({...foodForm, ingredients: e.target.value})}
                  placeholder="tomato, onion, garlic..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-allergens">Allergens (comma-separated)</Label>
                <Textarea
                  id="edit-allergens"
                  value={foodForm.allergens}
                  onChange={(e) => setFoodForm({...foodForm, allergens: e.target.value})}
                  placeholder="nuts, dairy, gluten..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dietary Information</Label>
              <div className="grid grid-cols-4 gap-2">
                {dietaryOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit-${option}`}
                      checked={foodForm.dietaryInfo.includes(option)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFoodForm({...foodForm, dietaryInfo: [...foodForm.dietaryInfo, option]});
                        } else {
                          setFoodForm({...foodForm, dietaryInfo: foodForm.dietaryInfo.filter(d => d !== option)});
                        }
                      }}
                    />
                    <Label htmlFor={`edit-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isAvailable"
                checked={foodForm.isAvailable}
                onCheckedChange={(checked) => setFoodForm({...foodForm, isAvailable: checked})}
              />
              <Label htmlFor="edit-isAvailable">Available for ordering</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditFood} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
