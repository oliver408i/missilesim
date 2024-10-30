import numpy as np
import typing

class Quaternion:
    def __init__(self, x, y, z, w):
        self.x = x
        self.y = y
        self.z = z
        self.w = w
    
    def to_rotation_matrix(self):
        """
        Converts a quaternion into a 3x3 rotation matrix.
        Quaternion q should be in the format (x, y, z, w).
        """
        return np.array([
            [1 - 2 * (self.y * self.y + self.z * self.z), 2 * (self.x * self.y - self.z * self.w), 2 * (self.x * self.z + self.y * self.w)],
            [2 * (self.x * self.y + self.z * self.w), 1 - 2 * (self.x * self.x + self.z * self.z), 2 * (self.y * self.z - self.x * self.w)],
            [2 * (self.x * self.z - self.y * self.w), 2 * (self.y * self.z + self.x * self.w), 1 - 2 * (self.x * self.x + self.y * self.y)]
        ])

def quaternion_from_tuple(x: typing.Tuple[float, float, float, float]) -> Quaternion:
    return Quaternion(x[0], x[1], x[2], x[3])

def calculate_velocity_from_quaternion(quaternion: Quaternion, speed=10) -> typing.Tuple[float, float, float]:
    # Initial bullet direction in local coordinates (0, 0, -1)
    initial_direction = np.array([0, 0, -1])
    
    # Convert quaternion to rotation matrix
    rotation_matrix = quaternion.to_rotation_matrix()
    
    # Rotate initial direction vector by the rotation matrix
    rotated_direction = np.dot(rotation_matrix, initial_direction)
    
    # Scale the direction by the speed to get the velocity
    velocity = rotated_direction * speed
    
    # Convert the np.float64s to floats, then convert to a tuple
    # (for sending back to the client or further processing)
    return tuple(float(x) for x in velocity)
